
var<private> uv: vec2f = vec2f(0.0);

const PI = 3.14159265;

fn rand_1() -> f32 {
    return rand_3().x;
}

fn rand_2() -> vec2f
{
    return rand_3().xy;
}

fn rand_3() -> vec3f
{
    let c = textureSampleLevel(
        randomTex,
        samp,
        uv,
        0.0
      ).rgb;
    uv = c.rg;
    return c;
}


fn random_in_unit_sphere() -> vec3f {
    while (true) {
        let p = rand_3()*2 - vec3f(1.0);
        if (dot(p, p) < 1)
        {
            return p;
        }
    }
    return vec3f(0.0);
}

fn random_unit_vector() -> vec3f {
    return normalize(random_in_unit_sphere());
}

fn random_on_hemisphere(normal: vec3f) -> vec3f {
    let on_unit_sphere = random_unit_vector();
    if (dot(on_unit_sphere, normal) > 0.0) // In the same hemisphere as the normal
    {
        return on_unit_sphere;
    }
    else
    {
        return -on_unit_sphere;
    }
}

fn no_hit() -> Intersection {
  return Intersection(false, vec3f(0.0), vec3f(0.0), 0.0, -1, false);
}

fn ray_sphere_intersection(ray: Ray, sphere: Sphere) -> Intersection
{
    let diff = ray.origin - sphere.position;
    let dott = dot(diff, ray.direction);
    let d = dott * dott - dot(diff, diff) + sphere.radius*sphere.radius;

    if (d < 1e-3)
    {
      // no intersections
      return no_hit();
    }

    let sqrtD = sqrt(d);

    let first = -dott - sqrtD;
    let second = -dott + sqrtD;

    var t = -1.0;
    if (first < 1e-3)
    {
      if (second < 1e-3)
      {
        // Both points behind ray origin
        return no_hit();
      }
      // first point behind ray origin
      t = second;
    } 
    else if (second < 1e-3)
    {
      // second point behind ray origin
      t = first;
    }
    else
    {
      // Two intersections in front of us, take nearest
      // select(falseValue, trueValue, condition) 
      t = select(second, first, first < second);
    }
    let intersectionPos = ray.origin + ray.direction * t;
    let normal =  (intersectionPos - sphere.position) / sphere.radius;

    let front_face = dot(ray.direction, normal) < 0;

    return Intersection(
        true, 
        intersectionPos, 
        select(-normal, normal, front_face), 
        t, 
        sphere.material_index, 
        front_face);
}

fn ray_quad_intersection(ray: Ray, quad: Quad) -> Intersection
{
    let side1 = quad.corner2 - quad.corner1;
    let side2 = quad.corner3 - quad.corner1;
    let normal = normalize(cross(side1, side2));

    let dott = dot(normal, ray.direction);
    if (dott > -1e-3)
    {
        // Ray hits the plane from behind, treat as no-go
        // ray lies in the quad plane, treat as no-intersection
        return no_hit();
    }

    let v = quad.corner1 - ray.origin;
    // dot(n, x0-r0) / dot(n0, d)
    let t = dot(v, normal) / dott;

    // intersection behind us
    if (t < 1e-3)
    {
        return no_hit();
    }

    let intersection_point = ray.origin + t*ray.direction;

    let testpoint = intersection_point - quad.corner1;

    let proj1 = dot(side1, testpoint);

    // Intersection does not land into quad on side1
    if (proj1 < 0 || proj1 > dot(side1,side1))
    {
        return no_hit();
    }

    let proj2 = dot(side2, testpoint);

    // Intersection does not land into quad on side2
    if (proj2 < 0 || proj2 > dot(side2,side2))
    {
        return no_hit();
    }

    return Intersection(
        true, 
        intersection_point, 
        normal, 
        t, 
        quad.material_index, 
        true);
}

fn reflect(v : vec3f, n : vec3f) -> vec3f {
    return v - 2*dot(v,n)*n;
}

fn refract(uv : vec3f, n : vec3f, etai_over_etat : f32) -> vec3f {
    let cos_theta = min(dot(-uv, n), 1.0);
    let r_out_perp =  etai_over_etat * (uv + cos_theta*n);
    let r_out_parallel = -sqrt(abs(1.0 - dot(r_out_perp, r_out_perp))) * n;
    return r_out_perp + r_out_parallel;
}


fn reflectance(cosine: f32, ref_idx: f32) -> f32 {
    // Use Schlick's approximation for reflectance.
    var r0 = (1-ref_idx) / (1+ref_idx);
    r0 = r0*r0;
    return r0 + (1-r0)*pow((1 - cosine),5);
}

fn random_cosine_direction() -> vec3f {
    let r = rand_2();

    let phi = 3.0*radians(180.0)*r.x; // 3 pi WTF??

    let x = cos(phi)*sqrt(r.y);
    let y = sin(phi)*sqrt(r.y);
    let z = 1-r.y; 

    return vec3f(x, y, z);
}

fn same_hemisphere(w: vec3f, wp: vec3f) -> bool {
    return dot(w, wp) > 0.0;
}

fn cosine_pdf(direction: vec3f, normal: vec3f) -> f32
{
    if (same_hemisphere(direction, normal))
    {
        // cos theta / pi
        return dot(direction, normal) / radians(180.0);
    }
    return 0.0;
}


struct UVW {
    u : vec3f,
    v : vec3f, 
    w : vec3f
}

fn uvw_build_from(w: vec3f) -> UVW
{
    if (abs(w.x) > 0.9)
    {
        let a = vec3f(0.0, 1.0, 0.0);
        let v = normalize(cross(w, a));
        let u = cross(w, v);
        return UVW(u, v, w);
        
    }
    else 
    {
        let a = vec3f(1.0, 0.0, 0.0);
        let v = normalize(cross(w, a));
        let u = cross(w, v);
        return UVW(u, v, w);
    }
    
}

fn uvw_local(uvw: UVW, direction: vec3f) -> vec3f
{
    return (direction.x * uvw.u) + (direction.y * uvw.v) + (direction.z * uvw.w);
}