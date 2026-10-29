# -*- coding: utf-8 -*-
"""
Script para gerar cidade.html unificada diretamente a partir da arena.html.
Padroniza 100% a escala da vila de Talking Island (2.4x) proporcional ao personagem Talibrac,
com portas acessíveis, terreno contínuo da ilha sem inundação, colisões nas paredes dos prédios,
boneco de treino e portal monumental da dungeon.
"""

with open('c:/TECX SOFTHOUSE/IS ONLINE/prototipo/arena.html', 'r', encoding='utf-8') as f:
    cidade = f.read()

# 1. Substituir Título
cidade = cidade.replace(
    '<title>IS BLADE - Arena (Three.js moderno)</title>',
    '<title>IS BLADE - Talking Island Village (Lineage 2 Oficial)</title>'
)

# 2. Adicionar CSS específico da cidade (minimap, atmosfera, portal prompt, teleporte)
extra_css = """
/* Cidade e Vila de Talking Island */
.tp-btn { pointer-events:auto; cursor:pointer; padding:4px 8px; font-size:10px; font-weight:700; color:var(--ink); background:var(--panel); border:1px solid var(--line); border-radius:4px; transition:all .15s; }
.tp-btn:hover { background:rgba(90,169,255,0.25); border-color:var(--gold); color:var(--gold); }
.atmo-bar-box { display:flex; gap:4px; margin-top:2px; }
.atmo-btn { pointer-events:auto; cursor:pointer; padding:4px 8px; font-size:10px; font-weight:600; color:var(--dim); background:rgba(8,14,30,.7); border:1px solid var(--line); border-radius:3px; }
.atmo-btn.active { color:var(--gold); border-color:var(--gold); background:rgba(245,196,81,.18); }
#portal-prompt { position:fixed; left:50%; top:68%; transform:translateX(-50%); background:var(--panel); border:2px solid var(--sys); border-radius:8px; padding:10px 24px; text-align:center; color:#fff; font-size:13px; font-weight:700; box-shadow:0 0 20px rgba(90,169,255,.6); display:none; z-index:50; }
#portal-prompt b { color:var(--gold); }
"""
cidade = cidade.replace('</style>', extra_css + '\n</style>')

# 3. Substituir Brand do Cabeçalho
brand_old = '<div id="brand">IS BLADE<span>o despertar de baium</span></div>'
brand_new = '''<div id="brand">IS BLADE<span>TALKING ISLAND VILLAGE</span></div>
  <div id="town-status" style="font-size:10px;color:var(--dim);margin-top:2px">Vila Inicial Humana (Lineage 2 Oficial 1:1) &middot; Praça Central &middot; Arena de Duelo</div>'''
cidade = cidade.replace(brand_old, brand_new)

# 4. Substituir Botão Sair para a Vila por Botão Entrar na Dungeon e Minimapa
city_btn_old = '<a href="cidade.html" id="cityBtn" class="ui" title="Sair do Duelo e Voltar para a Ilha de Talking" style="right:142px;top:12px;height:36px;padding:0 14px;line-height:36px;text-align:center;text-decoration:none;font-weight:800;font-size:11.5px;letter-spacing:.05em;color:var(--gold);background:var(--panel);border:1.5px solid var(--gold);border-radius:6px;pointer-events:auto;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 0 16px rgba(0,0,0,.85);z-index:90">🏰 Sair para a Vila</a>'
dungeon_btn_new = '''<a href="arena.html?mode=dungeon" id="dungeonBtn" class="ui" title="Ir para a Dungeon do Baium" style="right:54px;top:12px;height:36px;padding:0 14px;line-height:36px;text-align:center;text-decoration:none;font-weight:800;font-size:11.5px;letter-spacing:.05em;color:#5aa9ff;background:var(--panel);border:1.5px solid #5aa9ff;border-radius:6px;pointer-events:auto;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 0 16px rgba(0,0,0,.85);z-index:90">🌀 Entrar na Dungeon do Baium</a>

<div id="map-panel" class="ui" style="top:58px;right:12px;pointer-events:auto;display:flex;flex-direction:column;align-items:flex-end;gap:8px">
  <div id="minimap-wrap" style="width:170px;height:170px;background:rgba(5,10,24,0.92);border:2px solid var(--sys);border-radius:8px;overflow:hidden;box-shadow:0 0 20px rgba(0,0,0,.85)">
    <canvas id="minimap" width="170" height="170" style="width:100%;height:100%;display:block"></canvas>
  </div>
  <div id="teleport-bar" style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;max-width:340px">
    <button class="tp-btn" onclick="teleportTo('arena')">Arena</button>
    <button class="tp-btn" onclick="teleportTo('portal')">Portal DG</button>
    <button class="tp-btn" onclick="teleportTo('church')">Porta Igreja</button>
    <button class="tp-btn" onclick="teleportTo('church_inside')">Dentro Igreja</button>
    <button class="tp-btn" onclick="teleportTo('fighter')">Guilda</button>
    <button class="tp-btn" onclick="teleportTo('shops')">Lojas</button>
    <button class="tp-btn" onclick="teleportTo('gate1')">Portão</button>
    <button class="tp-btn" onclick="teleportTo('hill')">Colina</button>
    <button class="tp-btn" onclick="teleportTo('port')">Porto</button>
    <button class="tp-btn" onclick="teleportTo('lighthouse')">Farol</button>
  </div>
  <div class="atmo-bar-box">
    <button id="btn-day" class="atmo-btn active" onclick="setAtmo('day')">☀️ Dia</button>
    <button id="btn-sunset" class="atmo-btn" onclick="setAtmo('sunset')">🌅 Pôr do Sol</button>
    <button id="btn-night" class="atmo-btn" onclick="setAtmo('night')">🌙 Noite</button>
  </div>
</div>
<div id="portal-prompt" class="ui">Pressione <b>[E]</b> para Entrar na Dungeon do Baium</div>
'''
cidade = cidade.replace(city_btn_old, dungeon_btn_new)

# 4.1. Expandir limite da arena para a ilha inteira (280 metros de raio)
cidade = cidade.replace("ARENA=13.5;", "ARENA=280.0;")

# 4.2. Ajustar iluminação, céu diurno e câmera de alcance total para a vila de Talking Island
cidade = cidade.replace("scene.background=new THREE.Color(0x05060d);", "scene.background=new THREE.Color(0x78b8e0);")
cidade = cidade.replace("scene.fog=new THREE.Fog(0x05060d,22,62);", "scene.fog=new THREE.FogExp2(0x78b8e0, 0.0018);")
cidade = cidade.replace("var camera=new THREE.PerspectiveCamera(46,1,.1,200);", "var camera=new THREE.PerspectiveCamera(50,1,.1,2000);")
cidade = cidade.replace("scene.add(new THREE.HemisphereLight(0x5b7bd6,0x14081a,2.2));", "scene.add(new THREE.HemisphereLight(0xbde0fe,0x334455,1.9));\nscene.add(new THREE.AmbientLight(0xffffff,0.65));")
cidade = cidade.replace("var key=new THREE.DirectionalLight(0xbcd2ff,2.6);key.position.set(-6,14,8);", "var key=new THREE.DirectionalLight(0xfff8ee,2.6);key.position.set(60,110,75);")

# 5. Substituir o cenário circular da arena pelas peças e mapa de Talking Island
idx1 = cidade.find('var floor=new THREE.Mesh(new THREE.CircleGeometry(24,64)')
idx2 = cidade.find('var starGeo=new THREE.BufferGeometry(),sp=new Float32Array(600*3);')

if idx1 == -1 or idx2 == -1:
    print("ERRO: Índices do cenário não encontrados!", idx1, idx2)
    exit(1)

with open('c:/TECX SOFTHOUSE/IS ONLINE/prototipo/assets/talking_island/village_colliders.json', 'r', encoding='utf-8') as cf:
    colliders_data = cf.read().strip()

village_env_code = """// ==================== VILA DE TALKING ISLAND (LINEAGE 2 OFICIAL 1:1) ====================
var portal = null, pr2 = null, ring2 = null; // Guardas de compatibilidade
var i = 0, a = 0; // Declaração de variáveis de iteração

// 0. COLISORES ESTÁTICOS DOS EDIFÍCIOS E MURALHA PERIMÉTRICA (ATIVOS NO PRIMEIRO FRAME)
var VILLAGE_STATIC_OBST = """ + colliders_data + """;
var OBST = window.OBST = (window.OBST && window.OBST.length ? window.OBST : []).concat(VILLAGE_STATIC_OBST);

// Função de elevação para colinas suaves fora da muralha (r > 76m) com geodata precisa
function getGroundHeight(x, z) {
  var dist = Math.hypot(x, z);
  if (dist <= 76.0) return 0.0;
  
  // Transição suave inicial após os portões e muralha
  var blend = Math.min(1.0, (dist - 76.0) / 22.0);
  
  // Relevo base de colinas verdes
  var hills = Math.sin(x * 0.032) * Math.cos(z * 0.032) * 4.2
            + Math.sin(x * 0.065 + 1.1) * 2.0
            + Math.cos(z * 0.055 - 0.7) * 1.6;
            
  // 4 Corredores de estrada abertos e nivelados para cada um dos 4 portões da vila:
  // Portão 1 (NE: 48.3, -50.1), Portão 2 (SE: 51.1, 43.4), Portão 3 (NW: -53.7, -42.7), Portão 4 (SW: -51.0, 51.5)
  var gateAngles = [-0.804, 0.704, -2.470, 2.352];
  var curAngle = Math.atan2(z, x);
  var roadBlend = 1.0;
  for (var gi = 0; gi < gateAngles.length; gi++) {
    var angDiff = Math.abs(Math.atan2(Math.sin(curAngle - gateAngles[gi]), Math.cos(curAngle - gateAngles[gi])));
    var crossDist = dist * Math.sin(angDiff);
    if (crossDist < 14.0 && dist < 170.0) {
      var rf = crossDist / 14.0;
      roadBlend = Math.min(roadBlend, rf * rf);
    }
  }
  
  // Aplica o corredor da estrada nivelando o chão nas saídas dos portões
  hills = hills * roadBlend;
  
  // Rampa descendo suavemente para a praia e píer ao sul (z > 80m)
  if (z > 80.0 && Math.abs(x - 28.0) < 32.0) {
    hills -= (z - 80.0) * 0.045;
  }
  // Limite da ilha no oceano
  if (dist > 260.0) {
    hills -= (dist - 260.0) * 0.065;
  }
  return Math.max(-4.8, hills * blend);
}

// 1. TERRENO CONTÍNUO DA ILHA (Chão Sólido na Cidade e Relevo de Colinas Verdes Fora dos Muros)
var islandGeo = new THREE.PlaneGeometry(800, 800, 160, 160);
islandGeo.rotateX(-Math.PI / 2);
var posAttr = islandGeo.attributes.position;
for (var vi = 0; vi < posAttr.count; vi++) {
  var vx = posAttr.getX(vi);
  var vz = posAttr.getZ(vi);
  posAttr.setY(vi, getGroundHeight(vx, vz));
}
islandGeo.computeVertexNormals();

var groundTex = new THREE.TextureLoader().load('assets/talking_island/real_village/si_v_t/Texture/sp_v_floor.png');
groundTex.colorSpace = THREE.SRGBColorSpace;
groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
groundTex.repeat.set(80, 80);
var islandMat = new THREE.MeshStandardMaterial({
  map: groundTex, roughness: 0.88, metalness: 0.08
});
var islandMesh = new THREE.Mesh(islandGeo, islandMat);
islandMesh.position.y = 0.0;
islandMesh.receiveShadow = true;
scene.add(islandMesh);

// 2. OCEANO AO REDOR DA COSTA (Nível do Mar Rebaixado a y = -5.5 m, Sem Inundar a Cidade)
var waterGeo = new THREE.PlaneGeometry(1600, 1600, 48, 48);
waterGeo.rotateX(-Math.PI / 2);
var waterMat = new THREE.MeshStandardMaterial({
  color: 0x0a2244, roughness: 0.15, metalness: 0.85, transparent: true, opacity: 0.92
});
var waterMesh = new THREE.Mesh(waterGeo, waterMat);
waterMesh.position.y = -5.5; // Nível do mar na costa
scene.add(waterMesh);
var waterPos = waterGeo.attributes.position;
var waterOrigY = [];
for (var wi = 0; wi < waterPos.count; wi++) waterOrigY.push(waterPos.getY(wi));

// 3. PRAÇA CENTRAL COM PISO CIRCULAR DE PEDRA LAVRADA E ÁREA DE DUELO ESCURA (Contraste de Textura)
var plazaTex = new THREE.TextureLoader().load('assets/talking_island/real_village/si_v_t/Texture/sp_floor02.png');
plazaTex.colorSpace = THREE.SRGBColorSpace;
plazaTex.wrapS = plazaTex.wrapT = THREE.RepeatWrapping;
plazaTex.repeat.set(6, 6);

var floor = new THREE.Mesh(new THREE.CircleGeometry(19.5, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({
  map: plazaTex,
  roughness: 0.84,
  metalness: 0.12
}));
floor.position.y = 0.02;
floor.receiveShadow = true;
scene.add(floor);

// Borda ornamental em bronze/dourado imperial ao redor da praça (Raio 19.5m)
var plazaBorder = new THREE.Mesh(
  new THREE.RingGeometry(19.2, 19.8, 64).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0xc49b45, roughness: 0.38, metalness: 0.72, side: THREE.DoubleSide })
);
plazaBorder.position.y = 0.025;
scene.add(plazaBorder);

// Piso da área central de duelo com tom mais escuro (Contraste de Textura - Raio 12.5m)
var duelFloor = new THREE.Mesh(
  new THREE.CircleGeometry(12.5, 64).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({
    map: plazaTex,
    color: 0x1c212a,
    roughness: 0.78,
    metalness: 0.22
  })
);
duelFloor.position.y = 0.023;
duelFloor.receiveShadow = true;
scene.add(duelFloor);

// Logotipo IS Labs em Cromo Azul com atmosfera de estúdio e reflexos metálicos preservados
var logoTex = new THREE.TextureLoader().load('assets/talking_island/textures/is_labs_duel_medallion.png');
logoTex.colorSpace = THREE.SRGBColorSpace;
var logoMat = new THREE.MeshStandardMaterial({
  map: logoTex, transparent: true, opacity: 1.0, roughness: 0.25, metalness: 0.75, depthWrite: false
});
var duelLogo = new THREE.Mesh(new THREE.PlaneGeometry(25.0, 25.0).rotateX(-Math.PI / 2), logoMat);
duelLogo.position.set(0, 0.026, 0);
scene.add(duelLogo);

// 4. CARREGADOR DOS MODELOS DA VILA COM ESCALA 3.2x UNIFICADA
var gltfLoader = new THREE.GLTFLoader();
var GLB_DIR = 'assets/talking_island/assembled_glb/';
var villageGroup = new THREE.Group();
scene.add(villageGroup);

var glbCache = {};
function getGlb(file, callback) {
  if (glbCache[file]) { callback(glbCache[file].clone(true)); return; }
  gltfLoader.load(GLB_DIR + file, function(gltf) {
    var root = gltf.scene;
    root.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true; child.receiveShadow = true;
        if (child.material) child.material.side = THREE.DoubleSide;
      }
    });
    glbCache[file] = root;
    callback(root.clone(true));
  });
}

// Inicializa prédios e feixe do farol
var lighthouseBeam = null;
fetch('assets/talking_island/village_data_threejs.json')
  .then(function(res) { return res.json(); })
  .then(function(entities) {
    entities.forEach(function(ent) {
      getGlb(ent.glb, function(obj) {
        var gh = getGroundHeight(ent.pos[0], ent.pos[2]);
        obj.position.set(ent.pos[0], ent.pos[1] + gh, ent.pos[2]);
        obj.rotation.y = ent.rotY || 0;
        var s = ent.scale || 1.0;
        obj.scale.set(s, s, s);
        villageGroup.add(obj);

        if (ent.glb === 'ti_lighthouse.glb' && !lighthouseBeam) {
          var spot = new THREE.SpotLight(0xfff5bb, 10, 360, Math.PI / 8, 0.35, 1.5);
          spot.position.set(0, 35, 0);
          var target = new THREE.Object3D();
          target.position.set(ent.pos[0] + 80, 10, ent.pos[2] + 80);
          scene.add(target);
          spot.target = target;
          obj.add(spot);
          lighthouseBeam = { spot: spot, target: target, angle: 0, originX: ent.pos[0], originZ: ent.pos[2] };
        }
      });
    });
  }).catch(function(e){ console.log('VILLAGE_LOAD_ERR', e); });

// 5. 8 BRASEIROS AO REDOR DA PRAÇA CENTRAL (RAIO 19.5M)
var braziers = [];
var BRAZIER_COUNT = 8, BRAZIER_RADIUS = 19.5;
for (var bi = 0; bi < BRAZIER_COUNT; bi++) {
  (function(idx) {
    var angle = idx * (Math.PI * 2 / BRAZIER_COUNT);
    var bx = Math.sin(angle) * BRAZIER_RADIUS, bz = Math.cos(angle) * BRAZIER_RADIUS;
    gltfLoader.load('assets/talking_island/models/SI_Fighter_brazier.gltf', function(gltf) {
      var bzObj = gltf.scene;
      bzObj.position.set(bx, 0, bz);
      bzObj.scale.set(4.8, 4.8, 4.8);
      bzObj.rotation.y = angle;
      var fireLight = new THREE.PointLight(0xff7722, 2.2, 16, 2);
      fireLight.position.set(0, 3.2, 0);
      bzObj.add(fireLight);
      villageGroup.add(bzObj);
      braziers.push({ light: fireLight, baseInt: 2.2 });
    });
  })(bi);
}

// 6. PORTAL DA DUNGEON — REFINADO (7.5 METROS DE ALTURA) NO RECANTO DO TELEPORTE (X = -13.5, Z = -13.0)
var portalGroup = new THREE.Group();
portalGroup.position.set(-13.5, 0, -13.0);
portalGroup.rotation.y = 0.65;
scene.add(portalGroup);

var portalPillarMat = new THREE.MeshStandardMaterial({ color: 0x1f273b, roughness: 0.8, metalness: 0.3 });
var pLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 7.8, 16), portalPillarMat);
pLeft.position.set(-4.2, 3.9, 0);
var pRight = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 7.8, 16), portalPillarMat);
pRight.position.set(4.2, 3.9, 0);

var pTrimMat = new THREE.MeshStandardMaterial({ color: 0xf5c451, roughness: 0.3, metalness: 0.8 });
[-1.6, 0.5, 2.5].forEach(function(y) {
  var tr1 = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 10, 32), pTrimMat);
  tr1.rotation.x = Math.PI / 2; tr1.position.set(-4.2, y + 3.9, 0);
  var tr2 = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 10, 32), pTrimMat);
  tr2.rotation.x = Math.PI / 2; tr2.position.set(4.2, y + 3.9, 0);
  portalGroup.add(tr1, tr2);
});

var archMesh = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.65, 16, 40, Math.PI), portalPillarMat);
archMesh.position.set(0, 3.9, 0);
portalGroup.add(pLeft, pRight, archMesh);

var pFloorRune = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.6, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
  color: 0x5aa9ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide
}));
pFloorRune.position.y = 0.06;
portalGroup.add(pFloorRune);

var ringOuter = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.16, 16, 64), new THREE.MeshBasicMaterial({ color: 0x5aa9ff }));
ringOuter.position.y = 3.9;
var ringInner = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.12, 16, 64), new THREE.MeshBasicMaterial({ color: 0x8b7bff }));
ringInner.position.y = 3.9;
portalGroup.add(ringOuter, ringInner);

var vortexMesh = new THREE.Mesh(new THREE.CircleGeometry(3.6, 64), new THREE.MeshBasicMaterial({
  color: 0x1b3577, transparent: true, opacity: 0.78, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
}));
vortexMesh.position.y = 3.9;
portalGroup.add(vortexMesh);

var portalLight = new THREE.PointLight(0x5aa9ff, 4.5, 26, 2);
portalLight.position.set(0, 4.0, 0);
portalGroup.add(portalLight);

var P_COUNT = 160;
var pGeo = new THREE.BufferGeometry();
var pPos = new Float32Array(P_COUNT * 3);
var pSpeeds = [];
for (var pi = 0; pi < P_COUNT; pi++) {
  var pAng = Math.random() * Math.PI * 2;
  var pRad = 0.4 + Math.random() * 3.2;
  pPos[pi * 3] = Math.cos(pAng) * pRad;
  pPos[pi * 3 + 1] = 0.3 + Math.random() * 7.2;
  pPos[pi * 3 + 2] = (Math.random() - 0.5) * 1.5;
  pSpeeds.push({ ang: pAng, rad: pRad, spd: 0.8 + Math.random() * 1.8, vy: 0.6 + Math.random() * 1.2 });
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
var pMat = new THREE.PointsMaterial({
  color: 0x8bc1ff, size: 0.18, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending
});
var portalParticles = new THREE.Points(pGeo, pMat);
portalGroup.add(portalParticles);

// 7. BONECO DE TREINO OFICIAL NA PRAÇA CENTRAL (ALVO DE COMBATE EM Z = -10)
var dummyGroup = new THREE.Group();
dummyGroup.position.set(0, 0, 0);
var dummyMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
var dBase = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.5, 16), dummyMat);
dBase.position.y = 0.25;
var dPost = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.8, 12), dummyMat);
dPost.position.y = 1.4;
var dTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.42, 1.4, 16), new THREE.MeshStandardMaterial({ color: 0x223355, roughness: 0.6 }));
dTorso.position.y = 1.75;
var dHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), new THREE.MeshStandardMaterial({ color: 0x992222, roughness: 0.5 }));
dHead.position.y = 2.75;
var dArms = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.18), dummyMat);
dArms.position.y = 1.95;
dummyGroup.add(dBase, dPost, dTorso, dHead, dArms);
dummyGroup.traverse(function(c){ if(c.isMesh){ c.castShadow=true; c.receiveShadow=true; } });
// dummyGroup é adicionado na entidade enemy
"""
cidade = cidade[:idx1] + village_env_code + cidade[idx2:]

# 6. Blindar buildClips contra objetos que não possuem vrm
cidade = cidade.replace(
    "function buildClips(rig){\n  var hum=rig.vrm.humanoid,",
    "function buildClips(rig){\n  if(!rig||!rig.vrm||!rig.vrm.humanoid)return;\n  var hum=rig.vrm.humanoid,"
)

# 7. Blindar playClip contra clips inexistentes
cidade = cidade.replace(
    "o=o||{};var d=rig&&rig.drv,clip=rig&&rig.clips[name];",
    "o=o||{};var d=rig&&rig.drv,clip=rig&&rig.clips&&rig.clips[name];"
)

# 8. Corrigir tryInit() para inicializar o vrm e criar mixer seguro para o boneco dummy
old_try_init = """function tryInit(){
  if(!MX.ready)return;
  [vrm,boss].forEach(function(r){
    if(r&&!r.drv){
      if(r.isGltf){
        r.drv={mixer:new THREE.AnimationMixer(r.root),actions:{},cur:null,curName:'',hold:0};
        playClip(r,'boss_idle',{fade:0});
      }else{
        buildClips(r);
        r.drv={mixer:new THREE.AnimationMixer(r.root),actions:{},cur:null,curName:'',hold:0};
        playClip(r,r===boss?'boss_idle':getPlayerIdleClip(),{fade:0});
      }
    }
  });"""

new_try_init = """function tryInit(){
  if(!MX.ready||!vrm||!vrm.vrm)return;
  if(!vrm.drv){
    buildClips(vrm);
    vrm.drv={mixer:new THREE.AnimationMixer(vrm.root),actions:{},cur:null,curName:'',hold:0};
    playClip(vrm,getPlayerIdleClip(),{fade:0});
  }
  if(boss&&!boss.drv){
    boss.drv={mixer:new THREE.AnimationMixer(boss.root),actions:{},cur:null,curName:'',hold:0};
  }"""
cidade = cidade.replace(old_try_init, new_try_init)

# 9. Corrigir enemyThink() para manter o boneco de treino estático na arena em z = -10
enemy_think_old = "function enemyThink(dt){\n  var E=S.en;if(S.dead||S.pdead)return;"
enemy_think_new = """function enemyThink(dt){
  S.ex = 0; S.ey = 0; S.ez = -10; S.eh = 0;
  S.en.state = 'idle';
  S.en.wait = 1e9;
  S.hp = 99999; S.maxhp = 99999;
  S.dead = false;
  return;
  var E=S.en;if(S.dead||S.pdead)return;"""
cidade = cidade.replace(enemy_think_old, enemy_think_new)

# 10. Substituir loadBaium pelo Alvo de Treino Oficial integrado ao motor de combate e desativar DG.on
b1 = cidade.find('loadBaium(function(r){')
b2 = cidade.find("if(DG.on)dgHub();")
if b1 == -1 or b2 == -1:
    print("ERRO: Índices do loadBaium não encontrados!", b1, b2)
    exit(1)
b2 += len("if(DG.on)dgHub();")

dummy_init_code = """// Inicia o Alvo de Treino Oficial na Cidade (Consome o Motor de Combate idêntico à Arena)
enemy.children.forEach(function(c) { c.visible = false; });
enemy.add(dummyGroup);
boss = { isGltf: false, root: dummyGroup, mats: [], clips: {}, drv: null, sword: null };
BOSS_ON = true;
enemy.visible = true;
S.ex = 0; S.ey = 0; S.ez = -10; S.eh = 0;
S.dead = false; S.en.wait = 1e9; S.en.name = "Boneco de Treino";
S.hp = 99999; S.maxhp = 99999;
TRAIN.on = true;
DG.on = false;
tryInit();
gestMsg('Bem-vindo à Ilha de Talking! Treine na Arena ou entre na Dungeon.');
"""
cidade = cidade[:b1] + dummy_init_code + cidade[b2:]

# 11. Proteger linha de rotação do portal antigo na frame2
old_portal_rot = "portal.rotation.z+=dt*.25;pr2.rotation.z-=dt*.5;ring2.rotation.z+=dt*.1;"
new_portal_rot = "if(portal)portal.rotation.z+=dt*.25;if(pr2)pr2.rotation.z-=dt*.5;if(ring2)ring2.rotation.z+=dt*.1;"
cidade = cidade.replace(old_portal_rot, new_portal_rot)

# 11.1 Ajustar HUD do inimigo para Boneco de Treino na Cidade
cidade = cidade.replace("var DG={on:true,room:-1", "var DG={on:false,room:-1")
old_render_hud = "function renderHud(){\n  if(DG.on&&DG.room<0){"
new_render_hud = "function renderHud(){\n  if(!DG.on){\n    $('#ehpfill').style.width='100%';\n    $('#ehptxt').textContent='Boneco de Treino (Imortal)  -  Pratique seus Combos e Skills';\n  }else if(DG.on&&DG.room<0){"
cidade = cidade.replace(old_render_hud, new_render_hud)
cidade = cidade.replace("var S={", "var S=window.S={")
cidade = cidade.replace("window.__ferr=true;", "window.S=S;window.TR=TR;window.req=req;window.__ferr=true;")
cidade = cidade.replace("var MOBS=[],EPROJ=[],OBST=[],obstGroup=", "var MOBS=[],EPROJ=[],OBST=(window.OBST&&window.OBST.length?window.OBST:[]),obstGroup=")
cidade = cidade.replace("clearObstacles();if(DG.portal){", "if(DG.on){clearObstacles();}if(DG.portal){")
cidade = cidade.replace("function obstPush(x,z,rr){", "window.obstPush=obstPush;function obstPush(x,z,rr){")

# 11.2 Integrar Geodata & Altura do Terreno (Personagem e Câmera sobem e descem colinas suavemente sem entrar nelas)
cidade = cidade.replace(
    'wrap.position.set(S.px,Math.sin(T*2)*.02,S.pz);',
    'var targetY = getGroundHeight(S.px, S.pz);\n'
    '  S.py = S.py !== undefined ? S.py : targetY;\n'
    '  S.py += (targetY - S.py) * Math.min(1.0, 24.0 * dt);\n'
    '  wrap.position.set(S.px, S.py + Math.sin(T * 2) * 0.02, S.pz);'
)
cidade = cidade.replace(
    'pmark.position.x=S.px;pmark.position.z=S.pz;',
    'pmark.position.set(S.px, (S.py || 0) + 0.06, S.pz);'
)
cidade = cidade.replace(
    'rings.position.set(S.px,.06,S.pz);',
    'rings.position.set(S.px, (S.py || 0) + 0.06, S.pz);'
)
cidade = cidade.replace(
    'aimFan.position.x=S.px;aimFan.position.z=S.pz;',
    'aimFan.position.set(S.px, (S.py || 0) + 0.05, S.pz);'
)
cidade = cidade.replace(
    'focus.set(S.px,1.2,S.pz);',
    'focus.set(S.px, (S.py || 0) + 1.2, S.pz);'
)
cidade = cidade.replace(
    'new THREE.Vector3(S.px,1.2,S.pz)',
    'new THREE.Vector3(S.px, (S.py || 0) + 1.2, S.pz)'
)
cidade = cidade.replace(
    'Math.max(.5,2.1-Fy*NAV.tpDist+shy)',
    'Math.max((S.py||0)+.5, (S.py||0)+2.1-Fy*NAV.tpDist+shy)'
)
old_cam_look = 'camera.lookAt(focus.x,focus.y+.6,focus.z);'
new_cam_look = (
    'var camGh = getGroundHeight(camera.position.x, camera.position.z);\n'
    '    if(camera.position.y < camGh + 0.75) camera.position.y = camGh + 0.75;\n'
    '    camera.lookAt(focus.x,focus.y+.6,focus.z);'
)
cidade = cidade.replace(old_cam_look, new_cam_look)


# 12. Inserir lógica de Minimapa, Atmosfera, Teleportes e Animação do Portal na Cidade
town_loop_code = """
  // ==================== ATUALIZAÇÕES DA VILA DE TALKING ISLAND ====================
  // Animação do Portal da Dungeon
  if (ringOuter && ringInner && vortexMesh) {
    ringOuter.rotation.z += dt * 0.45;
    ringInner.rotation.z -= dt * 0.65;
    vortexMesh.material.opacity = 0.68 + Math.sin(T * 3.5) * 0.16;
  }
  if (pGeo && pSpeeds) {
    var pArr = pGeo.attributes.position.array;
    for (var pii = 0; pii < P_COUNT; pii++) {
      var spdObj = pSpeeds[pii];
      spdObj.ang += dt * spdObj.spd;
      pArr[pii * 3] = Math.cos(spdObj.ang) * spdObj.rad;
      pArr[pii * 3 + 1] += spdObj.vy * dt;
      if (pArr[pii * 3 + 1] > 7.2) {
        pArr[pii * 3 + 1] = 0.3;
        spdObj.rad = 0.4 + Math.random() * 3.2;
      }
    }
    pGeo.attributes.position.needsUpdate = true;
  }

  // Interação de Proximidade com o Portal da DG no recanto do teleporte (x = -13.5, z = -13.0)
  var distToPortal = Math.hypot(S.px - (-13.5), S.pz - (-13.0));
  var pPrompt = document.getElementById('portal-prompt');
  if (distToPortal < 7.0) {
    if (pPrompt) pPrompt.style.display = 'block';
    if (distToPortal < 2.5) {
      window.location.href = 'arena.html?mode=dungeon';
    }
  } else {
    if (pPrompt) pPrompt.style.display = 'none';
  }

  // Ondas do Mar
  if (waterPos && waterOrigY) {
    var wt = T * 1.6;
    for (var wi = 0; wi < waterPos.count; wi++) {
      var wx = waterPos.getX(wi);
      var wz = waterPos.getZ(wi);
      waterPos.setY(wi, waterOrigY[wi] + Math.sin(wx * 0.04 + wt) * 0.35 + Math.cos(wz * 0.04 + wt) * 0.25);
    }
    waterPos.needsUpdate = true;
  }

  // Farol Giratório
  if (lighthouseBeam) {
    lighthouseBeam.angle += dt * 0.75;
    lighthouseBeam.target.position.x = lighthouseBeam.originX + Math.cos(lighthouseBeam.angle) * 120;
    lighthouseBeam.target.position.z = lighthouseBeam.originZ + Math.sin(lighthouseBeam.angle) * 120;
  }

  // Braseiros
  if (braziers && braziers.length) {
    var flick = Math.sin(T * 12) * 0.25 + Math.cos(T * 25) * 0.15;
    braziers.forEach(function(b) { b.light.intensity = b.baseInt + flick; });
  }

  // Minimapa da Cidade
  updateCityMinimap();
"""

# Inserir no início de frame2(dt, T)
cidade = cidade.replace("function frame2(dt,T){", "function frame2(dt,T){\n" + town_loop_code)

# 13. Adicionar funções auxiliares da cidade: updateCityMinimap, setAtmo, teleportTo, e checagem da tecla E para o portal
extra_functions = """
// ==================== FUNÇÕES AUXILIARES DA CIDADE ====================
var miniCanvas = document.getElementById('minimap');
var miniCtx = miniCanvas ? miniCanvas.getContext('2d') : null;

function updateCityMinimap() {
  if (!miniCtx || !miniCanvas) return;
  var w = miniCanvas.width, h = miniCanvas.height;
  miniCtx.clearRect(0, 0, w, h);
  miniCtx.fillStyle = '#0a2544'; miniCtx.fillRect(0, 0, w, h);
  var cx = w / 2, cy = h / 2, scale = 0.32; // Escala adaptada para os 280m da ilha

  // Contorno da Ilha
  miniCtx.beginPath(); miniCtx.arc(cx, cy, 78, 0, Math.PI * 2);
  miniCtx.fillStyle = '#2d4422'; miniCtx.fill();

  // Muralha Perimétrica (~74m de raio oficial)
  miniCtx.beginPath(); miniCtx.arc(cx, cy, 74.0 * scale, 0, Math.PI * 2);
  miniCtx.fillStyle = '#4c5562'; miniCtx.fill();
  miniCtx.strokeStyle = '#323a46'; miniCtx.lineWidth = 2.5; miniCtx.stroke();

  // Praça Central (19.5m de raio)
  miniCtx.beginPath(); miniCtx.arc(cx, cy, 19.5 * scale, 0, Math.PI * 2);
  miniCtx.fillStyle = '#3a4454'; miniCtx.fill();
  miniCtx.strokeStyle = '#f5c451'; miniCtx.lineWidth = 1.5; miniCtx.stroke();

  // Portal Dimensional (Recanto do Teleporte x = -13.5, z = -13.0)
  miniCtx.fillStyle = '#00d4ff'; miniCtx.beginPath(); miniCtx.arc(cx + (-13.5 * scale), cy + (-13.0 * scale), 4.5, 0, Math.PI * 2); miniCtx.fill();

  // Pontos de interesse
  miniCtx.fillStyle = '#8899bb'; miniCtx.fillRect(cx - 26 * scale, cy - 75 * scale, 20 * scale, 24 * scale); // Catedral de Einhasad
  miniCtx.fillStyle = '#996633'; miniCtx.fillRect(cx + 70 * scale, cy - 95 * scale, 18 * scale, 20 * scale); // Guilda dos Lutadores
  miniCtx.fillStyle = '#aa8855'; miniCtx.fillRect(cx + 25 * scale, cy + 0 * scale, 14 * scale, 12 * scale);   // Lojas e Armazém
  miniCtx.fillStyle = '#556688'; miniCtx.fillRect(cx - 48 * scale, cy - 24 * scale, 15 * scale, 14 * scale); // Clan Hall
  miniCtx.fillStyle = '#8b5a2b'; miniCtx.fillRect(cx + 20 * scale, cy + 120 * scale, 12 * scale, 26 * scale); // Porto
  miniCtx.fillStyle = '#ffe066'; miniCtx.beginPath(); miniCtx.arc(cx + 145 * scale, cy + 75 * scale, 5.5, 0, Math.PI * 2); miniCtx.fill(); // Farol

  // Jogador
  var px = cx + S.px * scale, py = cy + S.pz * scale;
  miniCtx.save(); miniCtx.translate(px, py); miniCtx.rotate(-cam.yaw + Math.PI);
  miniCtx.beginPath(); miniCtx.moveTo(0, -6); miniCtx.lineTo(4, 5); miniCtx.lineTo(-4, 5); miniCtx.closePath();
  miniCtx.fillStyle = '#58e08e'; miniCtx.fill();
  miniCtx.strokeStyle = '#ffffff'; miniCtx.lineWidth = 1; miniCtx.stroke();
  miniCtx.restore();
}

function setAtmo(mode) {
  document.querySelectorAll('.atmo-btn').forEach(function(b) { b.classList.remove('active'); });
  var activeBtn = document.getElementById('btn-' + mode);
  if (activeBtn) activeBtn.classList.add('active');

  if (mode === 'day') {
    scene.background = new THREE.Color(0x78b8e0);
    scene.fog.color.setHex(0x78b8e0);
    scene.fog.density = 0.0018;
    key.color.setHex(0xfff8ee); key.intensity = 2.6;
  } else if (mode === 'sunset') {
    scene.background = new THREE.Color(0xd97736);
    scene.fog.color.setHex(0xd97736);
    scene.fog.density = 0.0022;
    key.color.setHex(0xff7733); key.intensity = 2.3;
  } else if (mode === 'night') {
    scene.background = new THREE.Color(0x050c1e);
    scene.fog.color.setHex(0x050c1e);
    scene.fog.density = 0.0028;
    key.color.setHex(0x5577bb); key.intensity = 1.3;
  }
}
window.setAtmo = setAtmo;

function teleportTo(location) {
  if (location === 'arena') { S.px = 0; S.pz = 12; cam.yaw = 0; }
  else if (location === 'portal') { S.px = -10.5; S.pz = -10.5; cam.yaw = 0.65 + Math.PI; }
  else if (location === 'church') { S.px = -22.0; S.pz = -48.0; cam.yaw = Math.PI / 4; } // Em frente aos degraus e porta da Catedral
  else if (location === 'church_inside') { S.px = -13.0; S.pz = -62.0; cam.yaw = Math.PI / 4; } // Dentro da nave da Catedral
  else if (location === 'fighter') { S.px = 75.0; S.pz = -78.0; cam.yaw = -Math.PI / 4; }
  else if (location === 'shops') { S.px = 25.0; S.pz = 5.0; cam.yaw = -Math.PI / 2; }
  else if (location === 'gate1') { S.px = 36.0; S.pz = -38.0; cam.yaw = -Math.PI / 4; } // Em frente ao Portão da Muralha
  else if (location === 'hill') { S.px = 105.0; S.pz = -35.0; cam.yaw = -Math.PI / 3; } // No topo da colina verde
  else if (location === 'port') { S.px = 26.0; S.pz = 125.0; cam.yaw = Math.PI; }
  else if (location === 'lighthouse') { S.px = 145.0; S.pz = 75.0; cam.yaw = Math.PI / 4; }
  S.vx = 0; S.vz = 0;
  S.py = getGroundHeight(S.px, S.pz);
  if (wrap) wrap.position.set(S.px, S.py, S.pz);
}
window.teleportTo = teleportTo;
"""

# Interceptar tecla E perto do portal
key_hook = "window.addEventListener('keydown',function(e){\n  var k=e.key.toLowerCase();\n  if(k==='e' && Math.hypot(S.px - (-13.5), S.pz - (-13.0)) < 7.0){ window.location.href='arena.html?mode=dungeon'; return; }"
cidade = cidade.replace("window.addEventListener('keydown',function(e){\n  var k=e.key.toLowerCase();", extra_functions + "\n" + key_hook)

# Salvar cidade.html unificada
with open('c:/TECX SOFTHOUSE/IS ONLINE/prototipo/cidade.html', 'w', encoding='utf-8') as f:
    f.write(cidade)

print("cidade.html REGENERADA COM SUCESSO COM ESCALA 2.4x E TERRENO SÓLIDO! Tamanho final:", len(cidade), "caracteres.")
