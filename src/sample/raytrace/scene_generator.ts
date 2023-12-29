
const hslToRgb = (h:number, s:number, l:number) => {
    var r, g, b;
  
    if(s === 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p:number, q:number, t:number){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
  
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
  
    return [r, g, b];
}

const randomColorG = () => {
    return hslToRgb(r(), 1.0, 0.5);
}

const materialTypes = {
    metal: "METAL",
    lambertian: "LAMBERTIAN",
    dielectric: "DIELECTRIC",
    diffuselight: "DIFFUSELIGHT"
}

const createLambertian = (color) => { return {
    color: color,
    type: materialTypes.lambertian,
    fuzz: 0.0,
    ior: 0.0,
}};

const createMetal = (color, fuzz) => { return {
    color: color,
    type: materialTypes.metal,
    fuzz: fuzz,
    ior: 0.0,
}};

const createDielectric = (ior) => { return {
    color: [0.0, 0.0, 0.0],
    type: materialTypes.dielectric,
    fuzz: 0.0,
    ior: ior,
}};

const createLight = (color, intensity=1.0) => { return {
    color: [color[0]*intensity, color[1]*intensity, color[2]*intensity],
    type: materialTypes.diffuselight,
    fuzz: 0.0,
    ior: 0.0,
}};

const createSphere = (pos, rad, material_index) => {
    return {
        pos: pos,
        radius: rad, 
        material_index: material_index
    }
}

const createQuad = (corner1, corner2, corner3, material_index) => {
    return {
        corner1: corner1,
        corner2: corner2,
        corner3: corner3,
        material_index: material_index
    }
}

const createBox = (center, dims, material_index) => {

        const min = [center[0]-dims[0]*0.5, center[1]-dims[1]*0.5,center[2]-dims[2]*0.5]
        const max = [center[0]+dims[0]*0.5, center[1]+dims[1]*0.5,center[2]+dims[2]*0.5]

        return [
            // X
            createQuad(min, [min[0], min[1], max[2]], [min[0], max[1], min[2]], material_index),
            // Y
            createQuad(min, [max[0], min[1], min[2]], [min[0], min[1], max[2]], material_index),
            // Z
            createQuad(min,  [min[0], max[1], min[2]],[max[0], min[1], min[2]], material_index),

            // X
            createQuad(max,  [max[0], min[1], max[2]],[max[0], max[1], min[2]], material_index),
            // Y
            createQuad(max,  [max[0], max[1], min[2]],[min[0], max[1], max[2]], material_index),
            // Z
            createQuad(max,  [min[0], max[1], max[2]],[max[0], min[1], max[2]], material_index),
        ]


}

const toVec = v => `vec3f(${v[0]}, ${v[1]}, ${v[2]})`

const defaultScene = () => {
    const materials = [
        createLambertian([0.5, 0.5, 0.9]),
        createLambertian([0.6, 0.1, 0.9]),
        createMetal([1,1,1], 0.22),
        createDielectric(1.5),
        createLight([1.0,0.2,0.2]),
        createLight([0.2, 1.0, 0.2]),
        createLight([0.2, 0.2, 1.0]),
    ];

    const spheres = [
        createSphere([0.0, -40.0, 0.0], 39.0, 0),
        createSphere([0.0, 0.2, 0.0], 1.0, 1),
        createSphere([-2.0, 0.2, 0.0], 1.0, 2),
        createSphere([2.0, 0.2, 0.0], 1.0, 3)
    ]

    const quads = [
        createQuad([-1.0, 3.0, -1.0], [1.0, 3.0, -1.0], [-1.0, 3.0, 1.0], 4),
        createQuad([-4.0, 3.0, -1.0], [-2.0, 3.0, -1.0], [-4.0, 3.0, 1.0], 5),
        createQuad([2.0, 3.0, -1.0], [4.0, 3.0, -1.0], [2.0, 3.0, 1.0], 6),
    ]

    const bg_color = [0.0, 0.0, 0.0];
    return {
        materials, spheres, quads, bg_color
    }

}

const getRandomInt = (max) => Math.floor(Math.random() * max);

// random
const r = (s = 1.0) => Math.random()*s;

// noise
const n = (s = 1.0) => (Math.random() - 0.5)*2.0*s;

const ballsScene = () => {

    const materials = [
        createMetal([0.8, 0.8, 0.8], 0.1),
        createDielectric(1.5),
        createLambertian([0.8, 0.1, 0.8]),
        createLambertian([0.1, 0.8, 0.1]),
        createMetal([0.2, 0.4, 0.1], 0.0),
        createLight([2.0, 2.0, 0.0]),
        createLight([1.0, 0.0, 2.0]),
    ];

    let quads = [
        createQuad(
            [5.0, 0.0, 5.0], [5.0, 0.0, -5.0], [-5.0, 0.0, 5.0], 2
        ),
        createQuad(
            [-5.0, 5.0, 5.0], [-5.0, 0.0, 5.0], [-5.0, 5.0, 0.0], 4
        ),
    ]

    quads = quads.concat(createBox([0.5, 3.5, 0.5], [1.0, 1.0, 1.0], 4));

    let spheres = []
    for (let x = -5; x < 5; x+= 2)
    {
        for (let z = -5; z < 5; z+= 2)
        {
            const material = getRandomInt(materials.length);
            const radius = Math.random();
            spheres.push(
                createSphere([x, 1.0, z], radius , material)
            )
            if (materials[material].type === materialTypes.dielectric)
            {
                spheres.push(
                    createSphere([x, 1.0, z], -1.0*(radius-0.1) , material)
                )
            }
        }
    }

    const bg_color = [0.0, 0.0, 0.0];
    return {
        materials, spheres, quads, bg_color
    }

}

const ballsScene2 = () => {
    let materials = []
    let spheres = []
    let quads = []
    let material_index = 0;
    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
            for (let z = 0; z < 3; z++) {

                if (r() < 0.5) {
                    continue;
                }

                let voxelCenter = [-1.5 + x + n(0.1), -1.5 + y + n(0.1), -1.5 + z + n(0.1)]

                let materialType = getRandomInt(4);
                switch (materialType) {
                    case 0: {
                        materials.push(createDielectric(1.0 + r()));
                        break;
                    }
                    case 1: {
                        materials.push(createLambertian(randomColorG()));
                        break;
                    }
                    case 2: {
                        materials.push(createMetal(randomColorG(), r()));
                        break;
                    }
                    case 3: {
                        materials.push(createLight(randomColorG(), r(20.0)));
                        break;
                    }
                }


                if (r() < 0.7) {
                    const radius = r(0.5);
                    spheres.push(createSphere(voxelCenter, radius, material_index));
                    if (materials[material_index].type == materialTypes.dielectric)
                    {
                        spheres.push(createSphere(voxelCenter, -(radius-0.1), material_index));
                    }
                }
                else 
                {
                    quads = quads.concat(createBox(voxelCenter, [r(), r(), r()], material_index))
                }
                material_index++;
            }
        }
    }
    
    materials.push(createLambertian([1.0, 1.0, 1.0]));
    materials.push(createMetal([1.0, 1.0, 1.0], 0.0));
    materials.push(createMetal([1.0, 1.0, 1.0], 0.5));
    //material_index++
    // Far plane (z = -3)
    quads.push(createQuad([3.0, 3.0, -3],[-3.0, 3.0, -3],[3.0, -3.0, -3],material_index))
    // Top (y = 3)
    quads.push(createQuad([3.0, 3.0, 3],[-3.0, 3.0, 3],[3.0, 3.0, -3],material_index))
    // Bottom (y = -3)
    quads.push(createQuad([3.0, -3.0, 3],[3.0, -3.0, -3],[-3.0, -3.0, 3],material_index+1))
    
    // Left (x = -3)
    quads.push(createQuad([-3.0, 3.0, 3],[-3.0, -3.0, 3],[-3.0, 3.0, -3],material_index+2))
    // right (x = 3)
    quads.push(createQuad([3.0, 3.0, 3],[3.0, 3.0, -3],[3.0, -3.0, 3],material_index+2))
    const bg_color = [0.0, 0.0, 0.0];
    return {
        materials, spheres, quads, bg_color
    }
}

const dist = (a,b) => Math.sqrt(((a[0]-b[0]) * (a[0]-b[0])) + ((a[1]-b[1]) * (a[1]-b[1])) + ((a[2]-b[2])) * (a[2]-b[2]))

const bookscene = () => 
{
    let materials = []
    var ground_material = createLambertian([0.5, 0.5, 0.5]);
    materials.push(ground_material);
    let spheres = [];

    spheres.push(createSphere([0.0, -1000, 0], 1000, 0));
    for (let a = -11; a < 11; a++) {
        for (let b = -11; b < 11; b++) {
            let center = [ a + 0.9*r(), 0.2, b + 0.9*r()]
            if (dist(center, [0, 0.2, 0]) > 2.9)
            {
                let mat = r();
                if (mat < 0.7)
                {
                    materials.push(createLambertian(randomColorG()));
                    spheres.push(createSphere(center, 0.2, materials.length-1));
                }
                else if( mat < 0.8)
                {
                    materials.push(createMetal([r(0.5) + 0.5, r(0.5) + 0.5, r(0.5) + 0.5], r(0.5)));
                    spheres.push(createSphere(center, 0.2, materials.length-1));
                }
                else if (mat < 0.9)
                {
                    materials.push(createLight(randomColorG(), r(0.5)));
                    spheres.push(createSphere(center, 0.2, materials.length-1));
                }
                else 
                {
                    materials.push(createDielectric(1.5));
                    spheres.push(createSphere(center, 0.2, materials.length-1));
                }
            }
        }

    }
    materials.push(createDielectric(1.5));
    spheres.push(createSphere([-5, 1, 0], 1.0, materials.length-1))
    spheres.push(createSphere([-5, 1, 0], -0.9, materials.length-1))

    materials.push(createLight(randomColorG(), 0.1));
    spheres.push(createSphere([-2, 1, 0], 1.0, materials.length-1))

    materials.push(createLambertian([0.4, 0.2, 0.1]));
    spheres.push(createSphere([1, 1, 0], 1.0, materials.length-1))

    materials.push(createMetal([0.7, 0.6, 0.5], 0.0));
    spheres.push(createSphere([4, 1, 0], 1.0, materials.length-1))
    const quads = []
    // const bg_color = [0.5, 0.7, 1.0];
    const bg_color = [0.1, 0.1, 0.1];
    return {
        materials, spheres, quads, bg_color
    }
}

const quadToString = (q) => 
    `Quad(${toVec(q.corner1)}, ${toVec(q.corner2)}, ${toVec(q.corner3)}, ${q.material_index})`

const sceneGenerator = () => {

    const { materials, spheres, quads, bg_color } = defaultScene();
    //const { materials, spheres, quads, bg_color } = ballsScene2();
    // const { materials, spheres, quads, bg_color } = bookscene();

    const generateScene = () => {

        let lines = []
        lines.push(`const material_count = ${materials.length};`)
        lines.push(`const materials = array<Material, ${materials.length}>(`)
        const materialstrings = materials.map(m => `Material(${toVec(m.color)}, ${m.type}, ${m.fuzz}, ${m.ior}),`)
        lines = lines.concat(materialstrings);
        lines.push(`);`);
        
        lines.push(`const sphere_count = ${spheres.length};`)
        lines.push(`const spheres = array<Sphere, ${spheres.length}>(`)
        const spherestrings = spheres.map(s => `Sphere(${toVec(s.pos)}, ${s.radius}, ${s.material_index}),`)
        lines = lines.concat(spherestrings);
        lines.push(`);`);

        lines.push(`const quad_count = ${quads.length};`)
        if (quads.length > 0)
        {
            lines.push(`const quads = array<Quad, ${quads.length}>(`)
            const quadStrings = quads.map(q => `${quadToString(q)},`)
            lines = lines.concat(quadStrings);
            lines.push(`);`);
        }
        else {
            lines.push(`const quads = array<Quad, 1>();`);
        }
        lines.push(`const background_color = ${toVec(bg_color)};`);
        
        const quad_lights = quads.map((q,i) => {return {quad: q, index: i}}).filter(qi => materials[qi.quad.material_index].type == materialTypes.diffuselight);

        lines.push(`const light_count = ${quad_lights.length};`);
        lines.push(`const lights = array<Light, ${quads.length}>(`)
        const quad_light_strings = quad_lights.map(q => `Light(${q.index}),`);
        lines = lines.concat(quad_light_strings)
        lines.push(`);`);
        

        return lines.join('\n')
    };

    return {generateScene};

}

export default sceneGenerator;