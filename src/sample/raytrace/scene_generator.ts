const materialTypes = {
    metal: "METAL",
    lambertian: "LAMBERTIAN",
    dielectirc: "DIELECTRIC",
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

const createDielectric = (color, ior) => { return {
    color: color,
    type: materialTypes.dielectirc,
    fuzz: 0.0,
    ior: ior,
}};

const createLight = (color) => { return {
    color: color,
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

const toVec = v => `vec3f(${v[0]}, ${v[1]}, ${v[2]})`

const defaultScene = () => {
    const materials = [
        createLambertian([0.8, 0.8, 0.0]),
        createLambertian([0.8, 0.8, 0.0]),
        createMetal([0.8, 0.8, 0.8], 0.3),
        createMetal([0.8, 0.6, 0.2], 1.0),
        createDielectric([0.0, 0.0, 0.0], 1.5),
        createLight([0.5, 0.1, 0.5])
    ];

    const spheres = [
        createSphere([0.0, -40.0, 0.0], 39.0, 0),
        createSphere([0.0, 0.0, 0.0], 1.0, 1),
        createSphere([-2.0, 0.0, 0.0], 1.0, 2),
        createSphere([2.0, 0.0, 0.0], 1.0, 4),
        createSphere([2.0, 0.0, 0.0], -0.9, 4),
    ]

    const quads = [
        createQuad([-3.0, 3.0, -3.0], [3.0, 3.0, -3.0], [-1.0, 3.0, 3.0], 5)
    ]

    const bg_color = [0.0, 0.0, 0.0];
    return {
        materials, spheres, quads, bg_color
    }

}

const ballsScene = () => {

}


const sceneGenerator = () => {

    const { materials, spheres, quads, bg_color } = defaultScene();

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
        lines.push(`const quads = array<Quad, ${quads.length}>(`)
        const quadStrings = quads.map(q => `Quad(${toVec(q.corner1)}, ${toVec(q.corner2)}, ${toVec(q.corner3)}, ${q.material_index}),`)
        lines = lines.concat(quadStrings);
        lines.push(`);`);
        lines.push(`const background_color = ${toVec(bg_color)};`);

        return lines.join('\n')
    };

    return {generateScene};

}



export default sceneGenerator;