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

    const paramsBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });

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
            },
            {
                binding: 2,
                resource: {
                    buffer: paramsBuffer
                }
            }
        ],
    });


    const updateParams = () => {
        device.queue.writeBuffer(
            paramsBuffer,
            0,
            new Float32Array([
                params.exposure,
                params.gamma,
                params.tonemap_selection])
        );
    };


    const tonemap = commandEncoder => {

        updateParams();

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