/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { getNormalizedRgbaComponents } from '../../../../lib/utils.js';
import {
  type DefaultEffectProps,
  ShaderEffect,
  type ShaderEffectUniforms,
} from './ShaderEffect.js';

export interface LinearGradientEffectProps extends DefaultEffectProps {
  colors?: number[];
  angle?: number;
  stops?: number[];
}

export class LinearGradientEffect extends ShaderEffect {
  static z$__type__Props: LinearGradientEffectProps;
  override readonly name = 'linearGradient';

  static override getEffectKey(props: LinearGradientEffectProps): string {
    return `linearGradient${props.colors!.length}`;
  }

  static override resolveDefaults(
    props: LinearGradientEffectProps,
  ): Required<LinearGradientEffectProps> {
    const colors = props.colors ?? [0xff000000, 0xffffffff];

    let stops = props.stops;
    if (!stops) {
      stops = [];
      const calc = colors.length - 1;
      for (let i = 0; i < colors.length; i++) {
        stops.push(i * (1 / calc));
      }
    }
    return {
      colors,
      stops,
      angle: props.angle ?? 0,
    };
  }

  static override uniforms: ShaderEffectUniforms = {
    angle: {
      value: 0,
      method: 'uniform1f',
      type: 'float',
    },
    colors: {
      value: 0xffffffff,
      validator: (rgbas: number[]): number[] => {
        const cols = rgbas.map((rgbas) => getNormalizedRgbaComponents(rgbas));
        return cols.reduce((acc, val) => acc.concat(val), [] as number[]);
      },
      size: (props: LinearGradientEffectProps) => props.colors!.length,
      method: 'uniform4fv',
      type: 'vec4',
    },
    stops: {
      value: [],
      validator: (
        value: number[],
        props: LinearGradientEffectProps,
      ): number[] => {
        const colors = props.colors ?? [];
        let stops = value;
        const tmp: number[] = value;
        if (stops.length === 0 || (stops && stops.length !== colors.length)) {
          for (let i = 0; i < colors.length; i++) {
            if (stops[i]) {
              tmp[i] = stops[i]!;
              if (stops[i - 1] === undefined && tmp[i - 2] !== undefined) {
                tmp[i - 1] = tmp[i - 2]! + (stops[i]! - tmp[i - 2]!) / 2;
              }
            } else {
              tmp[i] = i * (1 / (colors.length - 1));
            }
          }
          stops = tmp;
        }
        return tmp;
      },
      size: (props: LinearGradientEffectProps) => props.colors!.length,
      method: 'uniform1fv',
      type: 'float',
    },
  };

  static override methods: Record<string, string> = {
    fromLinear: `
      vec4 function(vec4 linearRGB) {
        vec4 higher = vec4(1.055)*pow(linearRGB, vec4(1.0/2.4)) - vec4(0.055);
        vec4 lower = linearRGB * vec4(12.92);
        return mix(higher, lower, 1.0);
      }
    `,
    toLinear: `
      vec4 function(vec4 sRGB) {
        vec4 higher = pow((sRGB + vec4(0.055))/vec4(1.055), vec4(2.4));
        vec4 lower = sRGB/vec4(12.92);
        return mix(higher, lower, 1.0);
      }
    `,
    degToRad: `
      float function(float d) {
        return d * (PI / 180.0);
      }
    `,
    calcPoint: `
      vec2 function(float d, float angle) {
        return d * vec2(cos(angle), sin(angle)) + (u_dimensions * 0.5);
      }
    `,
  };

  static ColorLoop = (amount: number): string => {
    let loop = '';
    for (let i = 2; i < amount; i++) {
      loop += `colorOut = mix(colorOut, colors[${i}], clamp((dist - stops[${
        i - 1
      }]) / (stops[${i}] - stops[${i - 1}]), 0.0, 1.0));`;
    }
    return loop;
  };

  static override onColorize = (props: LinearGradientEffectProps) => {
    const colors = props.colors!.length || 1;
    return `
      float d = angle - 90.0;
      float a = $degToRad(d);
      float lineDist = abs(u_dimensions.x * cos(a)) + abs(u_dimensions.y * sin(a));
      vec2 f = $calcPoint(lineDist * 0.5, a);
      vec2 t = $calcPoint(lineDist * 0.5, $degToRad(d + 180.0));
      vec2 gradVec = t - f;
      float dist = dot((v_textureCoordinate.xy * u_dimensions) - f, gradVec) / dot(gradVec, gradVec);

      float stopCalc = (dist - stops[0]) / (stops[1] - stops[0]);
      vec4 colorOut = mix(colors[0], colors[1], stopCalc);
      for(int i = 1; i < ${colors}-1; i++) {
        stopCalc = (dist - stops[i]) / (stops[i + 1] - stops[i]);
        colorOut = mix(colorOut, colors[i + 1], clamp(stopCalc, 0.0, 1.0));
      }
      return colorOut;
    `;
  };
}
