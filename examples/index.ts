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

import {
  MainRenderDriver,
  RendererMain,
  ThreadXRenderDriver,
  type IRenderDriver,
  type Dimensions,
} from '@lightningjs/renderer';
import { assertTruthy } from '@lightningjs/renderer/utils';
import coreWorkerUrl from './common/CoreWorker.js?importChunkUrl';
import coreExtensionModuleUrl from './common/AppCoreExtension.js?importChunkUrl';
import type { ExampleSettings } from './common/ExampleSettings.js';

(async () => {
  // URL params
  const urlParams = new URLSearchParams(window.location.search);
  let driverName = urlParams.get('driver');
  const test = urlParams.get('test') || 'test';

  if (driverName !== 'main' && driverName !== 'threadx') {
    driverName = 'threadx';
  }

  let driver: IRenderDriver | null = null;

  if (driverName === 'main') {
    driver = new MainRenderDriver();
  } else {
    driver = new ThreadXRenderDriver({
      coreWorkerUrl,
    });
  }

  const appDimensions = {
    width: 1920,
    height: 1080,
  };

  const renderer = new RendererMain(
    {
      ...appDimensions,
      deviceLogicalPixelRatio: 0.6666667,
      devicePhysicalPixelRatio: 1,
      clearColor: 0x00000000,
      coreExtensionModule: coreExtensionModuleUrl,
    },
    'app',
    driver,
  );

  await renderer.init();

  const canvas = document.querySelector('#app>canvas');

  assertTruthy(canvas instanceof HTMLCanvasElement);

  const overlayText = renderer.createTextNode({
    color: 0xff0000ff,
    text: `Test: ${test} | Driver: ${driverName}`,
    zIndex: 99999,
    parent: renderer.root,
    fontSize: 50,
  });
  overlayText.once(
    'textLoaded',
    (target: any, { width, height }: Dimensions) => {
      overlayText.x = appDimensions.width - width - 20;
      overlayText.y = appDimensions.height - height - 20;
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const module = await import(`./tests/${test}.ts`);

  const exampleSettings: ExampleSettings = {
    testName: test,
    renderer,
    appDimensions,
    driverName: driverName as 'main' | 'threadx',
    canvas,
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await module.default(exampleSettings);
})().catch((err) => {
  console.error(err);
});
