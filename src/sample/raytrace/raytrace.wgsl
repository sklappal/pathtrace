
@group(0) @binding(0) var<uniform> params : Params;
@group(0) @binding(1) var randomTex : texture_2d<f32>;
@group(0) @binding(2) var samp : sampler;
@group(0) @binding(3) var outputTex : texture_storage_2d<rgba16float, write>;


fn sphere_pdf_gen() -> vec3f
{
    return random_unit_vector();
}

fn sphere_pdf_val() -> f32
{
    return 1.0 / (4.0 * radians(180));
}

fn cosine_pdf_gen(uvw : UVW) -> vec3f
{
    return uvw_local(uvw, random_cosine_direction());
}

fn cosine_pdf_val(direction : vec3f, uvw : UVW) -> f32
{
    let cos_theta = dot(direction, uvw.w);
    return max(0.0, cos_theta / radians(180.0));
}


fn scatter(ray : Ray, intersection : Intersection) -> Scatter
{
    let material = materials[intersection.material_index];
    var new_direction: vec3f;
    var attenuation: vec3f;
    var pdf = 1.0f;
    var scattering_pdf = 1.0f;
    if (material.material_type == DIFFUSELIGHT)
    {
        if (intersection.front_face)
        {
            return Scatter(false, Ray(vec3f(0.0), vec3f(0.0)), material.color*params.lightIntensity, scattering_pdf, pdf);
        }
        else 
        {
            return Scatter(false, Ray(vec3f(0.0), vec3f(0.0)), background_color, scattering_pdf, pdf);
        }
    }

    if (material.material_type == METAL)
    {
        new_direction = reflect(ray.direction, intersection.normal) + material.fuzz_factor * random_unit_vector();
        attenuation = material.color;
    }
    else if (material.material_type == DIELECTRIC)
    {
        attenuation = vec3f(1.0, 1.0, 1.0);
        let refraction_ratio = select(material.index_of_refraction, 1.0/material.index_of_refraction, intersection.front_face);

        let cos_theta = min(dot(-ray.direction, intersection.normal), 1.0);
        let sin_theta = sqrt(1.0 - cos_theta*cos_theta);

        let cannot_refract :bool = refraction_ratio * sin_theta > 1.0;
        new_direction = select(
          refract(ray.direction, intersection.normal, refraction_ratio),
          reflect(ray.direction, intersection.normal),
          cannot_refract
        );
    }
    else
    {
        const advanced_sampling = false;
        if (advanced_sampling)
        {
            let light_amount = 0.5;
            if (rand_1() > light_amount)
            {
                let uvw = uvw_build_from(intersection.normal);
                new_direction = uvw_local(uvw, random_cosine_direction());

                // catch degenerate case
                if (dot(new_direction, new_direction) < 1e-6)
                {
                    new_direction = intersection.normal;
                }
            }
            else
            {
                new_direction = random_towards_quad(intersection.position);
            }
            attenuation = material.color;
            let cos_theta = dot(new_direction, intersection.normal);
            let cos_pdf = max(0.0, cos_theta/radians(180.0));
            let light_pdf = light_pdf_value(intersection.position, new_direction);
            pdf = light_amount*light_pdf + (1.0-light_amount)*cos_pdf*2.0;
            
            
            scattering_pdf = cos_pdf;
        }
        else 
        {
            let uvw = uvw_build_from(intersection.normal);
            new_direction = uvw_local(uvw, random_cosine_direction());

            // catch degenerate case
            if (dot(new_direction, new_direction) < 1e-6)
            {
                new_direction = intersection.normal;
            }
            attenuation = material.color;
        }
    }
    
    return Scatter(
        true,
        Ray(intersection.position, normalize(new_direction)),
        attenuation,
        scattering_pdf, 
        pdf
    );

}

fn ray_hits_objects(ray: Ray) -> Intersection
{
    var min_dist = 1e6;
    var min_intersection: Intersection;
    for (var i = 0; i < sphere_count; i++)
    {
      let intersection = ray_sphere_intersection(ray, spheres[i]);
      if (intersection.hit && (intersection.t < min_dist))
      {
          min_dist = intersection.t;
          min_intersection = intersection;
      }
    }

    for (var i = 0; i < quad_count; i++)
    {
      let intersection = ray_quad_intersection(ray, quads[i]);
      if (intersection.hit && (intersection.t < min_dist))
      {
          min_dist = intersection.t;
          min_intersection = intersection;
      }
    }
    return min_intersection;
}


fn random_towards_quad(origin: vec3f) -> vec3f
{
    let quad = quads[0];

    let side1 = quad.corner2 - quad.corner1;
    let side2 = quad.corner3 - quad.corner1;

    let point = quad.corner1 +  rand_1()*side1  + rand_1()*side2;
    return normalize(point - origin);
}

fn light_pdf_value(origin: vec3f, dir: vec3f) -> f32 {
    let quad = quads[0];
    let intersection = ray_quad_intersection(Ray(origin, dir), quad);
    if (!intersection.hit)
    {
        return 0.0;
    }

    let side1 = quad.corner2 - quad.corner1;
    let side2 = quad.corner3 - quad.corner1;
    let area = length(side1) * length(side2);

    let distance_squared = intersection.t * intersection.t;
    let cosine = abs(dot(dir, intersection.normal));

    return distance_squared / (cosine * area);
}

fn scattering_pdf(ray_in: Ray, intersection: Intersection, scattered: Ray) -> f32 {
  
    if (materials[intersection.material_index].material_type == LAMBERTIAN)
    {
        return cosine_pdf(scattered.direction, intersection.normal);
    }
    
    return 1.0;
}

fn ray_color(ray: Ray) -> vec3f
{
    var intersection = ray_hits_objects(ray);

    if (!intersection.hit)
    {
        return background_color;
    }

    var depth = 0;
    var cur_ray = ray;

    const max_depth = 15;
    var intersections = array<Intersection, max_depth>();
    var scatters = array<Scatter, max_depth>();
    var scatter_pdfs = array<vec2f, max_depth>();

    

    while (intersection.hit && depth < max_depth)
    {
        intersections[depth] = intersection;
        let scatter = scatter(cur_ray, intersection);
        scatters[depth] = scatter;

        // Hit emitter
        if (!scatter.did_scatter)
        {
          break;
        }

        scatter_pdfs[depth] = vec2f(scatter.scattering_pdf, scatter.pdf);

        depth += 1;
        cur_ray = scatter.scattered;
        intersection = ray_hits_objects(cur_ray);
    }
    let max_achieved_depth = depth;

    // Assume the ray went into the background
    var color = background_color;
    
    // If the last ray hit something ..
    if (intersection.hit)
    {
        // return vec3f(1.0, 0.0, 0.0);
        color = scatters[depth].attenuation;
    }

    // Loop back to origin and accumulate color
    for (var i = depth; i > 0; i--)
    {
        let color_contribution = (scatter_pdfs[i-1].x * scatters[i-1].attenuation) / scatter_pdfs[i-1].y;
        color = color * color_contribution;
    }


    // if (max_achieved_depth == 0)
    // {
    //     return vec3f(0.0, 0.0, 0.0);
    // } else if (max_achieved_depth == 1)
    // {
    //     return vec3f(1.0, 0.0, 0.0);
    // } else if (max_achieved_depth == 2)
    // {
    //     return vec3f(0.0, 1.0, 0.0);
    // }
    // else {
    //     return vec3f(0.0,0.0, 1.0);
    // }

    return color;
}

fn rand(time:f32) -> vec2f {
    return fract(sin(vec2f(time * 12.9898, time*78.233)) * 43758.5453);
}

@compute @workgroup_size(16, 16, 1)
fn main(
  @builtin(global_invocation_id) global_invocation_id : vec3u,
  @builtin(local_invocation_id) local_invocation_id : vec3u
) {

    let pixelSize = 1.0/(params.textureSize.xy);
    // This is to initialize the random generator state
    uv = (vec2f(global_invocation_id.xy) + vec2f(0.5, 0.5) + rand(params.time)*1000.0) * pixelSize;

    let aspectRatio = params.textureSize.x/params.textureSize.y;

    let lookfrom = vec3f(params.cameraPosition.x, params.cameraPosition.y, params.cameraPosition.z);

    let lookat = normalize(vec3f(sin(params.yaw)*sin(params.pitch), cos(params.pitch), cos(params.yaw)*sin(params.pitch)));
    let vup = vec3f(0.0, 1.0, 0.0);
    
    let w = lookat;
    let u = normalize(cross(vup, w));
    let v = normalize(cross(w, u));

    let center = lookfrom;

    let focal_length = 1.0;
    let theta = radians(params.fov);
    let h = tan(theta/2);
    let viewport_height = 2 * h * focal_length;
    let viewport_width = viewport_height * aspectRatio;
    let viewport_u = viewport_width * u;
    let viewport_v = -viewport_height * v;

    // Calculate the horizontal and vertical delta vectors from pixel to pixel.
    let pixel_delta_u = viewport_u / params.textureSize.x;
    let pixel_delta_v = viewport_v / params.textureSize.y;

    let viewport_upper_left = center - (focal_length * w) - viewport_u/2 - viewport_v/2;
    let pixel00_loc = viewport_upper_left + 0.5 * (pixel_delta_u + pixel_delta_v);

    var color = vec3f(0.0);

    for (var i = 0; i < i32(params.samplesPerPixel); i++)
    {
      var noise = 2*rand_2() - vec2f(1.0);

      let offset = f32(global_invocation_id.x) * pixel_delta_u + f32(global_invocation_id.y) * pixel_delta_v;

      let pixel_center = pixel00_loc + offset + noise.x * pixel_delta_u + noise.y * pixel_delta_v;
      let ray_direction = normalize(pixel_center - center);

      color += ray_color(Ray(center, ray_direction));
    }
    

    let writeIndex = vec2<i32>(global_invocation_id.xy);

    color /= params.samplesPerPixel;

    textureStore(outputTex, writeIndex, vec4(color, 1.0));
}

