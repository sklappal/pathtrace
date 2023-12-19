import fullscreenTexturedQuadWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';


const initDisplayResults = (navigator, device, context, texture) => {

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device,
        format: presentationFormat,
        alphaMode: 'premultiplied',
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
                view: null as GPUTextureView,
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear' as const,
                storeOp: 'store' as const,
            },
        ],
    };


    const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
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

    const displayResults = commandEncoder => {
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        passEncoder.setPipeline(fullscreenQuadPipeline);
        passEncoder.setBindGroup(0, showResultBindGroup);
        passEncoder.draw(6);
        passEncoder.end();
    };

    const updateDisplayTexture = context => 
        renderPassDescriptor.colorAttachments[0].view = context
          .getCurrentTexture()
          .createView();

    return {displayResults, updateDisplayTexture}

};

export default initDisplayResults;