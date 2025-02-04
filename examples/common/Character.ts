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

import type {
  INode,
  INodeWritableProps,
  RendererMain,
  TextureDesc,
} from '@lightningjs/renderer';
import { assertTruthy } from '@lightningjs/renderer/utils';

export class Character {
  node: INode;
  curIntervalAnimation: ReturnType<typeof setTimeout> | null = null;
  direction!: 'left' | 'right'; // Set in setState
  state!: 'idle' | 'walk' | 'run' | 'jump'; // Set in setState
  leftFrames: TextureDesc[] = [];

  constructor(
    private props: Partial<INodeWritableProps>,
    private renderer: RendererMain,
    private rightFrames: TextureDesc<'SubTexture'>[],
  ) {
    this.node = renderer.createNode({
      x: props.x,
      y: props.y,
      width: 200 / 2,
      height: 300 / 2,
      texture: rightFrames[0],
      parent: renderer.root,
      zIndex: props.zIndex,
    });
    this.leftFrames = rightFrames.map((frame) => {
      return renderer.makeTexture('SubTexture', frame.props, {
        flipX: true,
      });
    });
    assertTruthy(this.node);
    this.setState('right', 'idle');
  }

  setState(
    direction: 'left' | 'right',
    state: 'idle' | 'walk' | 'run' | 'jump',
  ) {
    if (this.direction === direction && this.state === state) {
      return;
    }
    this.direction = direction;
    this.state = state;
    switch (state) {
      case 'idle':
        this.animateCharacter(direction, 2, 3, 100);
        break;
      case 'walk':
        this.animateCharacter(direction, 0, 7, 100);
        break;
      case 'run':
        this.animateCharacter(direction, 0, 7, 100);
        break;
      case 'jump':
        this.animateCharacter(direction, 0, 7, 100);
        break;
    }
  }

  private animateCharacter(
    direction: 'left' | 'right',
    iStart: number,
    iEnd: number,
    intervalMs: number,
  ) {
    let curI = iStart;
    const frameArr = direction === 'left' ? this.leftFrames : this.rightFrames;
    if (iEnd + 1 > frameArr.length || iStart < 0) {
      throw new Error('Animation out of bounds');
    }
    if (this.curIntervalAnimation) {
      clearInterval(this.curIntervalAnimation);
    }
    const nextFrame = () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.node.texture = frameArr[curI]!;
      curI++;
      if (curI > iEnd) {
        curI = iStart;
      }
    };
    nextFrame();
    this.curIntervalAnimation = setInterval(nextFrame, intervalMs);
  }
}
