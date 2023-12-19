const material_count = 6;
const materials = array<Material, material_count>(
  Material(vec3f(0.8, 0.8, 0.0), LAMBERTIAN, 0.0, 0.0),
  Material(vec3f(0.7, 0.3, 0.3), LAMBERTIAN, 0.0, 0.0),
  Material(vec3f(0.8, 0.8, 0.8), METAL, 0.3, 0.0),
  Material(vec3f(0.8, 0.6, 0.2), METAL, 1.0, 0.0),
  Material(vec3f(0.0, 0.0, 0.0), DIELECTRIC, 1.0, 1.5),
  Material(vec3f(0.5, 0.5, 0.0), DIFFUSELIGHT, 0.0, 0.0)
);


const sphere_count = 5;
const spheres = array<Sphere, sphere_count>(
  Sphere(vec3f(0.0, -40.0, -5.0), 39.0, 0),
  Sphere(vec3f(0.0, 0.0, -5.0), 1.0, 1),
  Sphere(vec3f(-2.0, 0.0, -5.0), 1.0, 2),
  Sphere(vec3f(2.0, 0.0, -5.0), 1.0, 4),
  Sphere(vec3f(2.0, 0.0, -5.0), -0.9, 4),
);

const quad_count = 1;
const quads = array<Quad, quad_count>(
  Quad(vec3f(-3.0, 3.0, -8.0), vec3f(3.0, 3.0, -8.0), vec3f(-1.0, 3.0, -2.0), 5),
);

//const background_color = vec3f(0.70, 0.80, 1.00);
const background_color = vec3f(0.0);


@group(0) @binding(0) var<uniform> params : Params;
@group(0) @binding(1) var randomTex : texture_2d<f32>;
@group(0) @binding(2) var samp : sampler;
@group(0) @binding(3) var outputTex : texture_storage_2d<rgba16float, write>;


fn scatter(ray : Ray, intersection : Intersection) -> Scatter
{
    let material = materials[intersection.material_index];
    var new_direction: vec3f;
    var attenuation: vec3f;

    if (material.material_type == DIFFUSELIGHT)
    {
        if (intersection.front_face)
        {
            return Scatter(false, Ray(vec3f(0.0), vec3f(0.0)), material.color*params.lightIntensity);
        }
        else 
        {
            return Scatter(false, Ray(vec3f(0.0), vec3f(0.0)), background_color);
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
          cannot_refract || reflectance(cos_theta, refraction_ratio) > rand_1()
        );
    }
    else
    {
        new_direction = intersection.normal + random_unit_vector();
        
        // catch degenerate case
        if (dot(new_direction, new_direction) < 1e-6)
        {
             new_direction = intersection.normal;
        }
        attenuation = material.color;
    }
    
    return Scatter(
        true,
        Ray(intersection.position, normalize(new_direction)),
        attenuation
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


fn ray_color(ray: Ray) -> vec3f
{
    var intersection = ray_hits_objects(ray);

    if (!intersection.hit)
    {
        return background_color;
    }

    var depth = 0;
    var cur_ray = ray;

    const max_depth = 5;
    var intersections = array<Intersection, max_depth>();
    var scatters = array<Scatter, max_depth>();
    
    while (intersection.hit && depth < max_depth)
    {
        intersections[depth] = intersection;
        let scatter = scatter(cur_ray, intersection);
        scatters[depth] = scatter;

        if (!scatter.did_scatter)
        {
          break;
        }

        depth += 1;
        cur_ray = scatter.scattered;
        intersection = ray_hits_objects(cur_ray);
    }

    // Assume the ray went into the background
    var color = background_color;
    
    // If the last ray hit something ..
    if (intersection.hit)
    {
      // .. and the something was an emitter, use that as basis
      if (!scatters[depth].did_scatter)
      {
        color = scatters[depth].attenuation;
      }
    }

    // Loop back to origin and accumulate color
    for (var i = depth-1; depth > 0; depth--)
    {
      color *= scatters[i].attenuation;
    }
    
    return color;
}

@compute @workgroup_size(16, 16, 1)
fn main(
  @builtin(global_invocation_id) global_invocation_id : vec3u,
  @builtin(local_invocation_id) local_invocation_id : vec3u
) {

    let pixelSize = 1.0/(params.textureSize.xy);
    // This is to initialize the random generator state
    uv = (vec2f(global_invocation_id.xy) + vec2f(0.5, 0.5)) * pixelSize;
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
      if (i32(params.samplesPerPixel) == 1)
      {
        noise = vec2f(0.0, 0.0);
      }

      let offset = f32(global_invocation_id.x) * pixel_delta_u + f32(global_invocation_id.y) * pixel_delta_v;

      let pixel_center = pixel00_loc + offset + noise.x * pixel_delta_u + noise.y * pixel_delta_v;
      let ray_direction = normalize(pixel_center - center);

      color += ray_color(Ray(center, ray_direction));
    }
    

    let writeIndex = vec2<i32>(global_invocation_id.xy);

    color /= params.samplesPerPixel;

    textureStore(outputTex, writeIndex, vec4(color, 1.0));
}

