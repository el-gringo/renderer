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

import type { IAnimationController } from '../../common/IAnimationController.js';
import type { INode, INodeAnimatableProps } from '../../main-api/INode.js';
import type {
  RendererMain,
  ShaderDesc,
  TextureDesc,
} from '../../main-api/RendererMain.js';
import { assertTruthy } from '../../utils.js';
import type { NodeStruct } from './NodeStruct.js';
import { SharedNode } from './SharedNode.js';
import { ThreadXMainAnimationController } from './ThreadXMainAnimationController.js';
import type { IAnimationSettings } from '../../core/animations/CoreAnimation.js';

export class ThreadXMainNode extends SharedNode implements INode {
  private nextAnimationId = 1;
  protected _parent: ThreadXMainNode | null = null;
  protected _children: ThreadXMainNode[] = [];
  protected _texture: TextureDesc | null = null;
  protected _shader: ShaderDesc | null = null;
  private _src = '';

  /**
   * FinalizationRegistry for animation controllers. When an animation
   * controller is garbage collected, we let the render worker know so that
   * it can remove it's corresponding animation controler from it's stored
   * Set. This should ultimately allow the render worker to garbage collect
   * it's animation controller. The animation itself independent from the animation
   * controller, so it will continue to run until it's finished regardless of
   * whether or not the animation controller is garbage collected.
   */
  private animationRegistry = new FinalizationRegistry((id: number) => {
    this.emit('destroyAnimation', { id });
  });

  constructor(
    private rendererMain: RendererMain,
    sharedNodeStruct: NodeStruct,
    extendedCurProps?: Record<string, unknown>,
  ) {
    super(sharedNodeStruct, extendedCurProps);
  }

  get texture(): TextureDesc | null {
    return this._texture;
  }

  set texture(texture: TextureDesc | null) {
    if (this._texture === texture) {
      return;
    }
    this._texture = texture;
    if (texture) {
      this.emit('loadTexture', texture as unknown as Record<string, unknown>);
    } else {
      this.emit('unloadTexture', {});
    }
  }

  get shader(): ShaderDesc | null {
    return this._shader;
  }

  set shader(shader: ShaderDesc | null) {
    if (this._shader === shader) {
      return;
    }
    this._shader = shader;
    if (shader) {
      this.emit('loadShader', shader as unknown as Record<string, unknown>);
    }
  }

  animate(
    props: Partial<INodeAnimatableProps>,
    settings: Partial<IAnimationSettings>,
  ): IAnimationController {
    const id = this.nextAnimationId++;
    this.emit('createAnimation', { id, props, settings });
    const controller = new ThreadXMainAnimationController(this, id);
    this.animationRegistry.register(controller, id);
    return controller;
  }

  get src(): string {
    return this._src;
  }

  set src(imageUrl: string) {
    if (this._src === imageUrl) {
      return;
    }
    this._src = imageUrl;
    if (!imageUrl) {
      this.texture = null;
      return;
    }
    this.texture = this.rendererMain.makeTexture('ImageTexture', {
      src: imageUrl,
    });
  }

  //#region Parent/Child Props
  get parent(): ThreadXMainNode | null {
    return this._parent;
  }

  set parent(newParent: ThreadXMainNode | null) {
    const oldParent = this._parent;
    this._parent = newParent;
    this.parentId = newParent?.id ?? 0;
    if (oldParent) {
      const index = oldParent.children.indexOf(this);
      assertTruthy(
        index !== -1,
        "ThreadXMainNode.parent: Node not found in old parent's children!",
      );
      oldParent.children.splice(index, 1);
    }
    if (newParent) {
      newParent.children.push(this);
    }
  }

  get children(): ThreadXMainNode[] {
    return this._children;
  }
  //#endregion Parent/Child Props

  get props() {
    return this.curProps;
  }
}
