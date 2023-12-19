import tonemapWGSL from './tonemap.wgsl';


const initTonemap = (device, params, inputTexture) => {

    const tonemapPipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: device.createShaderModule({
                code: tonemapWGSL,
            }),
            entryPoint: 'main',
        },
    });


    const computePassDescriptor: GPUComputePassDescriptor = {};

    const frameBuffer = device.createTexture({
        size: {
          width: params.textureWidth,
          height: params.textureHeight,
        },
        format: 'rgba8unorm',
        usage:
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.TEXTURE_BINDING,
      })

    const computeBindGroup = device.createBindGroup({
        layout: tonemapPipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: inputTexture.createView()
            },
            {
                binding: 1,
                resource: frameBuffer.createView(),
            }
        ],
    });


    const tonemap = commandEncoder => {
        const computePass = commandEncoder.beginComputePass(computePassDescriptor);
        computePass.setPipeline(tonemapPipeline);
        computePass.setBindGroup(0, computeBindGroup);

        computePass.dispatchWorkgroups(
            Math.ceil(params.textureWidth / 16),
            Math.ceil(params.textureHeight / 16)
        );
        computePass.end();
    }

    return {tonemap, frameBuffer};

};


export default initTonemap;