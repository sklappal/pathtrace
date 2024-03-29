import raytraceWGSL from './raytrace.wgsl';
import math_utils from './math_utils.wgsl';
import types from './types.wgsl';
// import scene from './scene.wgsl'
import sceneGenerator from './scene_generator';


const initRaytrace = async (device, hasTimestampQuery, params) => {

    const response = await fetch('../assets/img/random.png');
    const imageBitmap = await createImageBitmap(await response.blob());
  
    const [srcWidth, srcHeight] = [imageBitmap.width, imageBitmap.height];
    const randomTexture = device.createTexture({
      size: [srcWidth, srcHeight, 1],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: randomTexture },
      [imageBitmap.width, imageBitmap.height]
    );

    const scene = sceneGenerator(params.scene).generateScene()


    const raytracePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: device.createShaderModule({
                code: math_utils + types + scene + raytraceWGSL,
            }),
            entryPoint: 'main',
        },
    });

    const computePassDescriptor: GPUComputePassDescriptor = {};

    const spareResultBuffers = [];

    var querySet, resolveBuffer;
    if (hasTimestampQuery) {
        querySet = device.createQuerySet({
            type: 'timestamp',
            count: 4,
        });
        resolveBuffer = device.createBuffer({
            size: 4 * BigInt64Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        });
        computePassDescriptor.timestampWrites = {
            querySet,
            beginningOfPassWriteIndex: 0,
            endOfPassWriteIndex: 1,
        };
    }


    const paramsBuffer = device.createBuffer({
        size: 128,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });

    const frameBuffer = device.createTexture({
        size: {
          width: params.textureWidth,
          height: params.textureHeight,
        },
        format: 'rgba16float',
        usage:
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.TEXTURE_BINDING,
      })
      
    const sampler = device.createSampler({
        addressModeU: 'repeat',
        addressModeV: 'repeat',
        magFilter: 'linear',
        minFilter: 'linear',
    });

    const computeBindGroup = device.createBindGroup({
        layout: raytracePipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: paramsBuffer,
                }
            },
            {
                binding: 1,
                resource: randomTexture.createView(),
            },
            {
                binding: 2,
                resource: sampler,
            },
            {
                binding: 3,
                resource: frameBuffer.createView(),
            }
        ],
    });



    const updateParams = () => {
        device.queue.writeBuffer(
            paramsBuffer,
            0,
            new Float32Array([
                params.textureWidth,
                params.textureHeight,
                params.fov,
                params.samplesPerPixel,
                params.cameraPosition[0],
                params.cameraPosition[1],
                params.cameraPosition[2],
                params.pitch,
                params.yaw,
                params.lightIntensity,
                params.time,
                params.light_sampling_amount])
        );
    };

    const raytrace = commandEncoder => {
        updateParams();

        if (params.sample_count < params.max_sample_count)
        {

            const computePass = commandEncoder.beginComputePass(computePassDescriptor);
            computePass.setPipeline(raytracePipeline);
            computePass.setBindGroup(0, computeBindGroup);

            computePass.dispatchWorkgroups(
                Math.ceil(params.textureWidth / 16),
                Math.ceil(params.textureHeight / 16)
            );
            computePass.end();
        }
    }

    let computePassDurationSum = 0;
    let timerSamples = 0;

    const queryPerf = commandEncoder => {
        if (hasTimestampQuery) {
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

                // In some cases the timestamps may wrap around and produce a negative
                // number as the GPU resets it's timings. These can safely be ignored.
                if (computePassDuration > 0) {
                    computePassDurationSum += computePassDuration;
                    timerSamples++;
                }
                resultBuffer.unmap();

                // Periodically update the text for the timer stats
                const kNumTimerSamplesPerUpdate = 30;
                if (timerSamples >= kNumTimerSamplesPerUpdate) {
                    const avgComputeMicroseconds = Math.round(
                        computePassDurationSum / timerSamples / (1000.0 * 1000)
                    );

                    console.log(`\
                        avg compute: ${avgComputeMicroseconds}ms
                        spare readback buffers:    ${spareResultBuffers.length}`);
                    computePassDurationSum = 0;
                    timerSamples = 0;
                }
                spareResultBuffers.push(resultBuffer);
            });
        }
    }

    return {raytrace, updateParams, queryPerf, frameBuffer};

};


export default initRaytrace;