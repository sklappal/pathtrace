import { makeSample, SampleInit } from '../../components/SampleLayout';

import initRaytrace from './raytrace_pipeline';
import initDisplayResults from './display_results_pipeline';
import initInteraction from './interaction_handler';

const init: SampleInit = async ({ canvas, pageState, gui }) => {

  const adapter = await navigator.gpu.requestAdapter();
  const hasTimestampQuery = adapter.features.has('timestamp-query');
  console.log("hasTimestampQuery:", hasTimestampQuery);
  const device = await adapter.requestDevice({
    requiredFeatures: hasTimestampQuery ? ['timestamp-query'] : []
  });

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const params = {
    textureWidth: 1920,
    textureHeight: 1080,
    fov: 80.0,
    samplesPerPixel: 100,
    cameraPosition: [0.0, 0.0, 0.0],
    pitch: Math.PI / 2.0,
    yaw: 0.0
  };

  let raytrace_pipeline = initRaytrace(device, hasTimestampQuery, params);

  let display_results_pipeline = initDisplayResults(navigator, device, context, raytrace_pipeline.frameBuffer);

  let interaction_handler = initInteraction(canvas, gui, params, raytrace_pipeline.updateParams);


  function frame() {

    interaction_handler.updateInteraction();

    const commandEncoder = device.createCommandEncoder();

    raytrace_pipeline.raytrace(commandEncoder);

    display_results_pipeline.updateDisplayTexture(context);

    display_results_pipeline.displayResults(commandEncoder);

    raytrace_pipeline.queryPerf(commandEncoder);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const Raytrace: () => JSX.Element = () =>
  makeSample({
    name: 'Raytrace',
    description:
      'This example shows how to raytrace using a WebGPU compute shader.',
    gui: true,
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      }
    ],
    filename: __filename,
  });

export default Raytrace;
