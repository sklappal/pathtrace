import { makeSample, SampleInit } from '../../components/SampleLayout';

import raytraceWGSL from './raytrace.wgsl';
import math_utils from './math_utils.wgsl';
import types from './types.wgsl';
import fullscreenTexturedQuadWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';



const init: SampleInit = async ({ canvas, pageState, gui }) => {


  const adapter = await navigator.gpu.requestAdapter();
  const hasTimestampQuery = adapter.features.has('timestamp-query');
  console.log("hasTimestampQuery:", hasTimestampQuery);
  const device = await adapter.requestDevice({
    requiredFeatures: ['timestamp-query']
  });


  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  
  const [srcWidth, srcHeight] = [1920, 1080];
  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = srcWidth * devicePixelRatio
  canvas.height = srcHeight * devicePixelRatio

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const raytracePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        code: math_utils + types + raytraceWGSL,
      }),
      entryPoint: 'main',
    },
  });

  const fullscreenQuadPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: fullscreenTexturedQuadWGSL,
      }),
      entryPoint: 'vert_main',
    },
    fragment: {
      module: device.createShaderModule({
        code: fullscreenTexturedQuadWGSL,
      }),
      entryPoint: 'frag_main',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined as GPUTextureView, // Assigned later
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear' as const,
        storeOp: 'store' as const,
      },
    ],
  };
  const computePassDescriptor: GPUComputePassDescriptor = {};

  const spareResultBuffers = [];

  let querySet = device.createQuerySet({
    type: 'timestamp',
    count: 4,
  });
  let resolveBuffer = device.createBuffer({
    size: 4 * BigInt64Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
  });
  computePassDescriptor.timestampWrites = {
    querySet,
    beginningOfPassWriteIndex: 0,
    endOfPassWriteIndex: 1,
  };
  renderPassDescriptor.timestampWrites = {
    querySet,
    beginningOfPassWriteIndex: 2,
    endOfPassWriteIndex: 3,
  };



  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  const paramsBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
  });

  const texture = device.createTexture({
    size: {
      width: srcWidth,
      height: srcHeight,
    },
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.STORAGE_BINDING |
      GPUTextureUsage.TEXTURE_BINDING,
  })

  const computeConstants = device.createBindGroup({
    layout: raytracePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 1,
        resource: {
          buffer: paramsBuffer,
        },
      }
    ],
  });

  const computeBindGroup0 = device.createBindGroup({
    layout: raytracePipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 3,
        resource: texture.createView(),
      }
    ],
  });


  const showResultBindGroup = device.createBindGroup({
    layout: fullscreenQuadPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: sampler,
      },
      {
        binding: 1,
        resource: texture.createView(),
      },
    ],
  });

  const params = {
    textureWidth: srcWidth,
    textureHeight: srcHeight,
  };

  
  device.queue.writeBuffer(
    paramsBuffer,
    0,
    new Float32Array([params.textureWidth, params.textureHeight])
  );
  
  gui.add(params, 'textureWidth')
  gui.add(params, 'textureHeight')

  let computePassDurationSum = 0;
  let renderPassDurationSum = 0;
  let timerSamples = 0;
  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    renderPassDescriptor.colorAttachments[0].view = context
    .getCurrentTexture()
    .createView();

    const commandEncoder = device.createCommandEncoder();

    const computePass = commandEncoder.beginComputePass(computePassDescriptor);
    computePass.setPipeline(raytracePipeline);
    computePass.setBindGroup(0, computeConstants);

    computePass.setBindGroup(1, computeBindGroup0);
    computePass.dispatchWorkgroups(
      Math.ceil(srcWidth / 16),
      Math.ceil(srcHeight / 16)
    );

    computePass.end();

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    passEncoder.setPipeline(fullscreenQuadPipeline);
    passEncoder.setBindGroup(0, showResultBindGroup);
    passEncoder.draw(6);
    passEncoder.end();

    let resultBuffer =
      spareResultBuffers.pop() ||
      device.createBuffer({
        size: 4 * BigInt64Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
    commandEncoder.resolveQuerySet(querySet, 0, 4, resolveBuffer, 0);
    commandEncoder.copyBufferToBuffer(
      resolveBuffer,
      0,
      resultBuffer,
      0,
      resultBuffer.size
    );


    device.queue.submit([commandEncoder.finish()]);


    resultBuffer.mapAsync(GPUMapMode.READ).then(() => {
      const times = new BigInt64Array(resultBuffer.getMappedRange());
      const computePassDuration = Number(times[1] - times[0]);
      const renderPassDuration = Number(times[3] - times[2]);

      // In some cases the timestamps may wrap around and produce a negative
      // number as the GPU resets it's timings. These can safely be ignored.
      if (computePassDuration > 0 && renderPassDuration > 0) {
        // console.log(computePassDuration, renderPassDuration);
        computePassDurationSum += computePassDuration;
        renderPassDurationSum += renderPassDuration;
        timerSamples++;
      }
      resultBuffer.unmap();

      // Periodically update the text for the timer stats
      const kNumTimerSamplesPerUpdate = 30;
      if (timerSamples >= kNumTimerSamplesPerUpdate) {
        const avgComputeMicroseconds = Math.round(
          computePassDurationSum / timerSamples / (1000.0*1000)
        );
        const avgRenderMicroseconds = Math.round(
          renderPassDurationSum / timerSamples / (1000.0*1000)
        );
        console.log( `\
  avg compute: ${avgComputeMicroseconds}ms
  avg render:  ${avgRenderMicroseconds}ms
  spare readback buffers:    ${spareResultBuffers.length}`);
        computePassDurationSum = 0;
        renderPassDurationSum = 0;
        timerSamples = 0;
      }
      spareResultBuffers.push(resultBuffer);
    });

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
      },
      {
        name: './raytrace.wgsl',
        contents: raytraceWGSL,
        editable: true,
      },
      {
        name: '../../shaders/fullscreenTexturedQuad.wgsl',
        contents: fullscreenTexturedQuadWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default Raytrace;
