import { makeSample, SampleInit } from '../../components/SampleLayout';

import raytraceWGSL from './raytrace.wgsl';
import fullscreenTexturedQuadWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';



const init: SampleInit = async ({ canvas, pageState, gui }) => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = 1920 * devicePixelRatio
  canvas.height = 1080 * devicePixelRatio

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
        code: raytraceWGSL,
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

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  const response = await fetch('../assets/img/Di-3d.png');
  const imageBitmap = await createImageBitmap(await response.blob());

  const [srcWidth, srcHeight] = [imageBitmap.width, imageBitmap.height];
  const cubeTexture = device.createTexture({
    size: [srcWidth, srcHeight, 1],
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: cubeTexture },
    [imageBitmap.width, imageBitmap.height]
  );

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
    });


  const paramsBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
  });

  const computeConstants = device.createBindGroup({
    layout: raytracePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: sampler,
      },
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
        binding: 2,
        resource: cubeTexture.createView(),
      },
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

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    const commandEncoder = device.createCommandEncoder();

    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(raytracePipeline);
    computePass.setBindGroup(0, computeConstants);

    computePass.setBindGroup(1, computeBindGroup0);
    computePass.dispatchWorkgroups(
      Math.ceil(srcWidth / 16),
      Math.ceil(srcHeight / 16)
    );

    computePass.end();

    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    passEncoder.setPipeline(fullscreenQuadPipeline);
    passEncoder.setBindGroup(0, showResultBindGroup);
    passEncoder.draw(6);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);

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
