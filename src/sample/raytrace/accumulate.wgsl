struct AccumulationParams {
    clearBuffer: i32,
    numSamples: i32
};


@group(0) @binding(0) var<uniform> accumulationParams : AccumulationParams;
@group(0) @binding(1) var input  : texture_2d<f32>;
@group(0) @binding(2) var prevAccum : texture_2d<f32>;
@group(0) @binding(3) var curAccum : texture_storage_2d<rgba16float, write>;
@group(0) @binding(4) var output : texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) invocation_id : vec3u) {
    let color = textureLoad(input, invocation_id.xy, 0).rgb;
    let accumulated = textureLoad(prevAccum, invocation_id.xy, 0).rgb;

    var sum = color + accumulated;
    if (accumulationParams.clearBuffer == 1)
    {
        sum = color;
    }
    textureStore(curAccum, invocation_id.xy, vec4f(sum, 1));
    textureStore(output, invocation_id.xy, vec4f(sum / f32(accumulationParams.numSamples), 1));

    // textureStore(output, invocation_id.xy, vec4f(color, 1));
}
