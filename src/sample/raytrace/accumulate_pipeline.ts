import accumulateWGSL from './accumulate.wgsl';


const initAccumulate = (device, params, inputTexture) => {

    const accumulatePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: device.createShaderModule({
                code: accumulateWGSL,
            }),
            entryPoint: 'main',
        },
    });

    const accumulationParameters = {
        clearBuffer: 0,
        numSamples: 0
    };

    const paramsBuffer = device.createBuffer({
        size: 8,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
    
    const updateParams = () => {
        device.queue.writeBuffer(
            paramsBuffer,
            0,
            new Int32Array([
                accumulationParameters.clearBuffer,
                accumulationParameters.numSamples])
        );
    };

    const computePassDescriptor: GPUComputePassDescriptor = {};

    const [accumBuf1, accumBuf2, frameBuffer] = [0, 1, 2].map(() => device.createTexture({
        size: {
            width: params.textureWidth,
            height: params.textureHeight,
        },
        format: 'rgba16float',
        usage:
            GPUTextureUsage.COPY_SRC |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.STORAGE_BINDING |
            GPUTextureUsage.TEXTURE_BINDING,
    }));

    const [computeBindGroup1, computeBindGroup2] = [0, 1].map(i => device.createBindGroup({
        layout: accumulatePipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: paramsBuffer,
                }
            },
            {
                binding: 1,
                resource: inputTexture.createView()
            },
            {
                binding: 2,
                resource: (i % 2 == 1 ? accumBuf1 : accumBuf2).createView(),
            },
            {
                binding: 3,
                resource: (i % 2 == 1 ? accumBuf2 : accumBuf1).createView(),
            },
            {
                binding: 4,
                resource: frameBuffer.createView() 
            }
        ],
    }));


    let index = 0;
    const accumulate = (commandEncoder, clearAccumulation) => {
        
        if (clearAccumulation)
        {
            accumulationParameters.clearBuffer = 1;
            accumulationParameters.numSamples = 1;
        }
        else
        {
            accumulationParameters.clearBuffer = 0;
            accumulationParameters.numSamples += 1;
        }

        updateParams();
        const computePass = commandEncoder.beginComputePass(computePassDescriptor);
        computePass.setPipeline(accumulatePipeline);
        computePass.setBindGroup(0, index % 2 == 1 ? computeBindGroup1 : computeBindGroup2);

        computePass.dispatchWorkgroups(
            Math.ceil(params.textureWidth / 16),
            Math.ceil(params.textureHeight / 16)
        );
        computePass.end();

        index++;
    }

    return { accumulate, frameBuffer };

};


export default initAccumulate;