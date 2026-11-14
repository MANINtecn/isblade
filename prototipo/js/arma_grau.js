/* Graus de equipamento (data/itens.json -> graus, conjunto): modelo da arma pelo grau + bonus de set + texto de grau.
   Uso na pagina (arena.html / cidade.html):
     ArmaGrau.aplica(rig, baseArma, attach, baseEscudo)  -> troca o modelo da arma e escudo do personagem L2
     ArmaGrau.aplicaArmadura(rig, equip, baseOf, findItem) -> aplica as texturas oficiais de armadura L2 (D, C, B, A) no corpo 3D
     ArmaGrau.conjunto(ITM, equip, baseOf, findItem) -> {grau, vida, dano, defesa, nome} do set completo
     ArmaGrau.tag(ITM, base, nivel) -> HTML curto "Grau D · Nv 20" */
(function(){
  var A = window.ArmaGrau = {};
  var texLoader = null, texCache = {};

  function getTex(path){
    if(!path) return null;
    if(!texLoader && window.THREE) texLoader = new THREE.TextureLoader();
    if(!texLoader) return null;
    if(!texCache[path]){
      var t = texLoader.load(path);
      t.flipY = false;
      if(window.THREE){
        if(THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
        else if(THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
      }
      texCache[path] = t;
    }
    return texCache[path];
  }

  // Tabela oficial de Texturas 1:1 do Lineage 2 Interlude por Raça e Grau (D, C, B, A)
  var RACE_TEXTURES = {
    elf_f: {
      D: {
        chest: 'assets/personagens/raw_test_elf/felf/Texture/FElf_m001_t01_u_sp.png',
        legs:  'assets/personagens/raw_test_elf/felf/Texture/FElf_m001_t01_l_sp.png',
        gloves:'assets/personagens/raw_test_elf/felf/Texture/FElf_m001_t01_g.png',
        boots: 'assets/personagens/raw_test_elf/felf/Texture/FElf_m001_t01_b.png'
      },
      C: {
        chest: 'assets/personagens/raw_test_elf/felf/Texture/FElf_m002_t1001_u_sp.png',
        legs:  'assets/personagens/raw_test_elf/felf/Texture/FElf_m002_t20_l_sp.png',
        gloves:'assets/personagens/raw_test_elf/felf/Texture/FElf_m002_t19_g.png',
        boots: 'assets/personagens/raw_test_elf/felf/Texture/FElf_m002_t20_b.png'
      },
      B: {
        chest: 'assets/personagens/raw_test_elf/felf/Texture/FElf_m011_t1004_u_sp.png',
        legs:  'assets/personagens/raw_test_elf/felf/Texture/FElf_m011_t1004_l_sp.png',
        gloves:'assets/personagens/raw_test_elf/felf/Texture/FElf_m011_t1004_g_sp.png',
        boots: 'assets/personagens/raw_test_elf/felf/Texture/FElf_m011_t1004_b_sp.png'
      },
      A: {
        chest: 'assets/personagens/raw_test_elf/felf/Texture/FElf_m008_t1005_u_sp.png',
        legs:  'assets/personagens/raw_test_elf/felf/Texture/FElf_m007_t1005_l_sp.png',
        gloves:'assets/personagens/raw_test_elf/felf/Texture/FElf_m008_t1005_g_sp.png',
        boots: 'assets/personagens/raw_test_elf/felf/Texture/FElf_m007_t1005_b_sp.png'
      }
    },
    human_fighter: {
      D: {
        chest: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m001_t01_u_sp.png',
        legs:  'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m001_t01_l_sp.png',
        gloves:'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m001_t01_g_sp.png',
        boots: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m001_t01_b_sp.png'
      },
      C: {
        chest: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m002_t1002_u_sp.png',
        legs:  'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m002_t34_l_sp.png',
        gloves:'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m002_t1002_g.png',
        boots: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m001_t1001_b.png'
      },
      B: {
        chest: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m008_t1004_u_ori.png',
        legs:  'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m008_t1004_l_ori.png',
        gloves:'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m008_t1004_g_sp.png',
        boots: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m008_t1004_b_ori.png'
      },
      A: {
        chest: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m013_t2000_u_sp.png',
        legs:  'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m013_t2000_l_sp.png',
        gloves:'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m013_t2000_g.png',
        boots: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m013_t2000_b_sp.png'
      }
    },
    human_fighter_female: {
      D: {
        chest: 'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m001_t01_u_sp.png',
        legs:  'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m001_t01_l_sp.png',
        gloves:'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m001_t01_g_ori.png',
        boots: 'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m001_t01_b_ori.png'
      },
      C: {
        chest: 'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m001_t1002_u_ori.png',
        legs:  'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m002_t34_l_sp.png',
        gloves:'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m001_t1002_g.png',
        boots: 'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m001_t1001_b.png'
      },
      B: {
        chest: 'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m010_t80_u_ori.png',
        legs:  'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m010_t80_l_ori.png',
        gloves:'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m010_t80_g.png',
        boots: 'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m010_t80_b.png'
      },
      A: {
        chest: 'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m013_t2000_u_sp.png',
        legs:  'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m013_t2000_l.png',
        gloves:'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m013_t2000_g.png',
        boots: 'assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m013_t2000_b_sp.png'
      }
    },
    elf_m: {
      D: {
        chest: 'assets/personagens/raw_roster_extra/melf/Texture/MElf_m001_t01_u.png',
        legs:  'assets/personagens/raw_roster_extra/melf/Texture/MElf_m001_t01_l.png',
        gloves:'assets/personagens/raw_roster_extra/melf/Texture/MElf_m001_t01_g.png',
        boots: 'assets/personagens/raw_roster_extra/melf/Texture/MElf_m001_t01_b.png'
      },
      C: {
        chest: 'assets/personagens/raw_roster_extra/melf/Texture/MElf_m005_t1002_u_sp.png',
        legs:  'assets/personagens/raw_roster_extra/melf/Texture/MElf_m008_t1002_l_sp.png',
        gloves:'assets/personagens/raw_roster_extra/melf/Texture/MElf_m005_t1002_g.png',
        boots: 'assets/personagens/raw_roster_extra/melf/Texture/MElf_m008_t1002_b.png'
      },
      B: {
        chest: 'assets/personagens/raw_roster_extra/melf/Texture/MElf_m011_t1004_u_ori.png',
        legs:  'assets/personagens/raw_roster_extra/melf/Texture/MElf_m011_t1004_l_sp.png',
        gloves:'assets/personagens/raw_roster_extra/melf/Texture/MElf_m011_t1004_g_sp.png',
        boots: 'assets/personagens/raw_roster_extra/melf/Texture/MElf_m011_t1004_b_sp.png'
      },
      A: {
        chest: 'assets/personagens/raw_roster_extra/melf/Texture/MElf_m012_t2000_u_sp.png',
        legs:  'assets/personagens/raw_roster_extra/melf/Texture/MElf_m012_t2000_l_sp.png',
        gloves:'assets/personagens/raw_roster_extra/melf/Texture/MElf_m012_t2000_g_sp.png',
        boots: 'assets/personagens/raw_roster_extra/melf/Texture/MElf_m012_t2000_b_sp.png'
      }
    },
    darkelf_f: {
      D: {
        chest: 'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkElf_m001_t01_u.png',
        legs:  'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkElf_m001_t01_l.png',
        gloves:'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkElf_m001_t01_g.png',
        boots: 'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkElf_m001_t01_b.png'
      },
      C: {
        chest: 'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkElf_m007_t1002_u_ori.png',
        legs:  'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkElf_m007_t1002_l_ori.png',
        gloves:'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkElf_m007_t1002_g.png',
        boots: 'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkElf_m007_t1002_b.png'
      },
      B: {
        chest: 'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkElf_m004_t1004_u_ori.png',
        legs:  'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkElf_m010_t1004_l_ori.png',
        gloves:'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkElf_m004_t1004_g_ori.png',
        boots: 'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkElf_m010_t1004_b_ori.png'
      },
      A: {
        chest: 'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkelf_m011_t2000_u_sp.png',
        legs:  'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkelf_m011_t2000_l_ad00_ori.png',
        gloves:'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkelf_m011_t2000_g_ori.png',
        boots: 'assets/personagens/raw_test_darkelf/textures/fdarkelf/Texture/FDarkelf_m011_t2000_b_ori.png'
      }
    },
    darkelf_m: {
      D: {
        chest: 'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkElf_m001_t01_u.png',
        legs:  'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkElf_m001_t01_l_sp.png',
        gloves:'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkElf_m001_t01_g.png',
        boots: 'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkElf_m001_t01_b.png'
      },
      C: {
        chest: 'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkElf_m007_t1002_u_ori.png',
        legs:  'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkElf_m002_t1002_l_ori.png',
        gloves:'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkElf_m007_t1002_g.png',
        boots: 'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkElf_m002_t1002_b.png'
      },
      B: {
        chest: 'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkElf_m003_t1004_u_ori.png',
        legs:  'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkElf_m007_t1004_l_ori.png',
        gloves:'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkElf_m003_t1004_g_ori.png',
        boots: 'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkElf_m007_t1004_b_ori.png'
      },
      A: {
        chest: 'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkelf_m011_t2000_u_ori.png',
        legs:  'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkelf_m011_t2000_l_ori.png',
        gloves:'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkelf_m011_t2000_g_ori.png',
        boots: 'assets/personagens/raw_test_darkelf/textures/mdarkelf/Texture/MDarkelf_m011_t2000_b_ori.png'
      }
    },
    dwarf_f: {
      D: {
        chest: 'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m001_t01_u.png',
        legs:  'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m001_t01_l.png',
        gloves:'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m001_t01_g.png',
        boots: 'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m001_t01_b.png'
      },
      C: {
        chest: 'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m004_t1002_u_sp.png',
        legs:  'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m004_t1002_l.png',
        gloves:'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m004_t1002_g.png',
        boots: 'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m002_t1002_b.png'
      },
      B: {
        chest: 'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m008_t1004_u_sp.png',
        legs:  'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m008_t1004_l_sp.png',
        gloves:'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m008_t1004_g_sp.png',
        boots: 'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m008_t1004_b_sp.png'
      },
      A: {
        chest: 'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m009_t2000_u_ori.png',
        legs:  'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m009_t2000_l_ad00.png',
        gloves:'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m009_t2000_g_sp.png',
        boots: 'assets/personagens/raw_tex_all/fdwarf/Texture/FDwarf_m009_t2000_b_ori.png'
      }
    },
    dwarf_m: {
      D: {
        chest: 'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m001_t01_u.png',
        legs:  'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m001_t01_l.png',
        gloves:'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m001_t01_g.png',
        boots: 'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m001_t01_b.png'
      },
      C: {
        chest: 'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m004_t1002_u_sp.png',
        legs:  'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m004_t1002_l_sp.png',
        gloves:'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m004_t1002_g.png',
        boots: 'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m004_t1002_b.png'
      },
      B: {
        chest: 'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m008_t1004_u_sp.png',
        legs:  'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m008_t1004_l_sp.png',
        gloves:'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m008_t1004_g_sp.png',
        boots: 'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m008_t1004_b_sp.png'
      },
      A: {
        chest: 'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m009_t2000_u_sp.png',
        legs:  'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m009_t2000_l_sp.png',
        gloves:'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m009_t2000_g_sp.png',
        boots: 'assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m009_t2000_b_sp.png'
      }
    },
    orc_f: {
      D: {
        chest: 'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m001_t01_u.png',
        legs:  'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m001_t01_l.png',
        gloves:'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m001_t01_g.png',
        boots: 'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m001_t01_b.png'
      },
      C: {
        chest: 'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m005_t1002_u_sp.png',
        legs:  'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m002_t1002_l_ori.png',
        gloves:'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m005_t1002_g.png',
        boots: 'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m002_t1002_b.png'
      },
      B: {
        chest: 'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m007_t1004_u_sh.png',
        legs:  'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m007_t1004_l_ori.png',
        gloves:'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m007_t1004_g_sh.png',
        boots: 'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m007_t1004_b_sp.png'
      },
      A: {
        chest: 'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m008_t2000_u_sp.png',
        legs:  'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m008_t2000_l_ad00_ori.png',
        gloves:'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m008_t2000_g_ori.png',
        boots: 'assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m008_t2000_b_sh.png'
      }
    },
    orc_m: {
      D: {
        chest: 'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m001_t01_u.png',
        legs:  'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m001_t01_l.png',
        gloves:'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m001_t01_g.png',
        boots: 'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m001_t01_b.png'
      },
      C: {
        chest: 'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m005_t1002_u_sp.png',
        legs:  'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m004_t1002_l_sp.png',
        gloves:'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m005_t1002_g.png',
        boots: 'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m004_t1002_b.png'
      },
      B: {
        chest: 'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m007_t1004_u_sh.png',
        legs:  'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m007_t1004_l_sh.png',
        gloves:'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m007_t1004_g_sh.png',
        boots: 'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m007_t1004_b_sh.png'
      },
      A: {
        chest: 'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m008_t2000_u_sp.png',
        legs:  'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m008_t2000_l_sp.png',
        gloves:'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m008_t2000_g_sh.png',
        boots: 'assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m008_t2000_b_sh.png'
      }
    },
    magic_f: {
      D: {
        chest: 'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m002_t01_u.png',
        legs:  'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m002_t01_l_sp.png',
        gloves:'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m002_t01_g.png',
        boots: 'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m002_t20_b.png'
      },
      C: {
        chest: 'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m008_t1002_u_ori.png',
        legs:  'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m002_t20_l_sp.png',
        gloves:'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m002_t19_g.png',
        boots: 'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m002_t20_b.png'
      },
      B: {
        chest: 'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m012_t80_u_sp.png',
        legs:  'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m012_t80_l_sp.png',
        gloves:'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m012_t80_g.png',
        boots: 'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m012_t80_b.png'
      },
      A: {
        chest: 'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m014_t2000_u_sp.png',
        legs:  'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m014_t2000_l_ad00_ori.png',
        gloves:'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m014_t2000_g_sp.png',
        boots: 'assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m014_t2000_b_sp.png'
      }
    },
    magic_m: {
      D: {
        chest: 'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m005_t01_u.png',
        legs:  'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m005_t01_l.png',
        gloves:'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m005_t01_g.png',
        boots: 'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m008_t1002_b.png'
      },
      C: {
        chest: 'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m003_t1002_u_sp.png',
        legs:  'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m008_t1002_l_sp.png',
        gloves:'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m002_t19_g.png',
        boots: 'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m008_t1002_b.png'
      },
      B: {
        chest: 'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m013_t1004_u_sp.png',
        legs:  'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m013_t1004_l_sp.png',
        gloves:'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m013_t1004_g_sp.png',
        boots: 'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m013_t1004_b_ori.png'
      },
      A: {
        chest: 'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m014_t2000_u_sp.png',
        legs:  'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m014_t2000_l_ori.png',
        gloves:'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m014_t2000_g_sp.png',
        boots: 'assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m014_t2000_b_sp.png'
      }
    }
  };

  function detectRace(rig){
    var s = (rig && (rig.charType || rig.race || rig.modelUrl)) || '';
    s = s.toLowerCase();
    if(s.indexOf('elf_f') >= 0 || s.indexOf('felf') >= 0) return 'elf_f';
    if(s.indexOf('elf_m') >= 0 || s.indexOf('melf') >= 0) return 'elf_m';
    if(s.indexOf('darkelf_f') >= 0 || s.indexOf('fdarkelf') >= 0) return 'darkelf_f';
    if(s.indexOf('darkelf_m') >= 0 || s.indexOf('mdarkelf') >= 0) return 'darkelf_m';
    if(s.indexOf('dwarf_f') >= 0 || s.indexOf('fdwarf') >= 0) return 'dwarf_f';
    if(s.indexOf('dwarf_m') >= 0 || s.indexOf('mdwarf') >= 0) return 'dwarf_m';
    if(s.indexOf('orc_f') >= 0 || s.indexOf('forc') >= 0) return 'orc_f';
    if(s.indexOf('orc_m') >= 0 || s.indexOf('morc') >= 0) return 'orc_m';
    if(s.indexOf('magic_f') >= 0 || s.indexOf('fmagic') >= 0) return 'magic_f';
    if(s.indexOf('magic_m') >= 0 || s.indexOf('mmagic') >= 0) return 'magic_m';
    if(s.indexOf('female') >= 0 || s.indexOf('ffighter') >= 0) return 'human_fighter_female';
    if(s.indexOf('fighter') >= 0 || s.indexOf('mfighter') >= 0) return 'human_fighter';

    if(rig && rig.root){
      var meshName = '';
      rig.root.traverse(function(c){
        if(c.isMesh && !meshName && c.name) meshName = c.name;
      });
      var mn = meshName.toLowerCase();
      if(mn.indexOf('felf') >= 0) return 'elf_f';
      if(mn.indexOf('melf') >= 0) return 'elf_m';
      if(mn.indexOf('fdarkelf') >= 0) return 'darkelf_f';
      if(mn.indexOf('mdarkelf') >= 0) return 'darkelf_m';
      if(mn.indexOf('fdwarf') >= 0) return 'dwarf_f';
      if(mn.indexOf('mdwarf') >= 0) return 'dwarf_m';
      if(mn.indexOf('forc') >= 0) return 'orc_f';
      if(mn.indexOf('morc') >= 0) return 'orc_m';
      if(mn.indexOf('fmagic') >= 0) return 'magic_f';
      if(mn.indexOf('mmagic') >= 0) return 'magic_m';
      if(mn.indexOf('ffighter') >= 0) return 'human_fighter_female';
      if(mn.indexOf('mfighter') >= 0) return 'human_fighter';
    }

    try {
      var ct = (localStorage.getItem('isblade.char_type') || '').toLowerCase();
      if(ct.indexOf('elf_f') >= 0) return 'elf_f';
      if(ct.indexOf('elf_m') >= 0) return 'elf_m';
      if(ct.indexOf('darkelf_f') >= 0) return 'darkelf_f';
      if(ct.indexOf('darkelf_m') >= 0) return 'darkelf_m';
      if(ct.indexOf('dwarf_f') >= 0) return 'dwarf_f';
      if(ct.indexOf('dwarf_m') >= 0) return 'dwarf_m';
      if(ct.indexOf('orc_f') >= 0) return 'orc_f';
      if(ct.indexOf('orc_m') >= 0) return 'orc_m';
      if(ct.indexOf('magic_f') >= 0) return 'magic_f';
      if(ct.indexOf('magic_m') >= 0) return 'magic_m';
      if(ct.indexOf('female') >= 0) return 'human_fighter_female';
      if(ct && RACE_TEXTURES[ct]) return ct;
    } catch(e){}

    return 'elf_f';
  }

  function filhoGrau(holder, attach, url){
    if(!holder._orig){ holder._orig = holder.children.slice(); }
    if(holder._grauUrl === url) return;
    holder._grauUrl = url;
    if(holder._grau){ holder.remove(holder._grau); holder._grau = null; }
    if(!url){
      holder._orig.forEach(function(c){ c.visible = false; });
      return;
    }
    holder._orig.forEach(function(c){ c.visible = false; });
    var g = attach(holder, null, url, { isL2: true });
    holder._grau = g;
  }

  A.aplica = function(rig, base, attach, baseEscudo){
    if(!rig || !rig.isL2 || !rig.root || !attach) return;
    var w = base && base.weapon, url = (base && base.modelo) || null;

    /* espada de duas maos */
    if(rig.swd2h){
      rig.swd2h.visible = (w === 'sword');
      if(w === 'sword') filhoGrau(rig.swd2h, attach, url || 'assets/personagens/twohanded_sword.glb');
    }

    /* escudo na mao esquerda */
    var shdUrl = (baseEscudo && baseEscudo.modelo) || (w === 'shield' ? (url || 'assets/personagens/round_shield.glb') : null);
    if(rig.shd){
      rig.shd.visible = (w === 'shield' || !!baseEscudo);
      if(rig.shd.visible) filhoGrau(rig.shd, attach, shdUrl || 'assets/personagens/round_shield.glb');
    }

    /* cajado do mago na mao direita */
    var isStaff = (w === 'staff');
    if(isStaff && url){
      if(!rig.stfL2){
        rig.stfL2 = attach(rig.root, 'Weapon_R_Bone', url, { isL2: true });
        rig.stfL2._grauUrl = url; rig.stfL2._orig = [];
      } else if(rig.stfL2 && rig.stfL2._grauUrl !== url){
        var bone = rig.stfL2.parent; if(bone) bone.remove(rig.stfL2);
        rig.stfL2 = attach(rig.root, 'Weapon_R_Bone', url, { isL2: true }); rig.stfL2._grauUrl = url; rig.stfL2._orig = [];
      }
    }
    if(rig.stfL2) rig.stfL2.visible = (isStaff && !!url);
    if(rig.stf) rig.stf.visible = false;
  };

  A.aplicaArmadura = function(rig, equip, baseOf, findItem){
    if(!rig || !rig.root) return;

    // Se o modelo 3D carregado já for uma armadura 3D completa nativa (GLB dedicado com armadura embutida),
    // NÃO sobrescrever com texturas 2D planas, pois as malhas e materiais originais do L2 já estão aplicados perfeitamente.
    var glbUrl = (rig._currentGlbUrl || '').toLowerCase();
    if(glbUrl.indexOf('_nograde.glb') >= 0 ||
       glbUrl.indexOf('_brigandine.glb') >= 0 ||
       glbUrl.indexOf('_fullplate.glb') >= 0 ||
       glbUrl.indexOf('_doom.glb') >= 0 ||
       glbUrl.indexOf('_tallum.glb') >= 0 ||
       glbUrl.indexOf('_imperial.glb') >= 0){
      return;
    }

    if(!rig._meshParts){
      rig._meshParts = {};
      rig.root.traverse(function(c){
        if(c.isMesh){
          var nl = (c.name || '').toLowerCase();
          if(nl.indexOf('chest') >= 0 || nl.indexOf('_u') >= 0) rig._meshParts.chest = c;
          else if(nl.indexOf('legs') >= 0 || nl.indexOf('_l') >= 0) rig._meshParts.legs = c;
          else if(nl.indexOf('gloves') >= 0 || nl.indexOf('_g') >= 0) rig._meshParts.gloves = c;
          else if(nl.indexOf('boots') >= 0 || nl.indexOf('_b') >= 0) rig._meshParts.boots = c;
          else if(nl.indexOf('face') >= 0 || nl.indexOf('_f') >= 0) rig._meshParts.face = c;
          else if(nl.indexOf('hair') >= 0 || nl.indexOf('_h') >= 0) rig._meshParts.hair = c;
        }
      });
    }

    var race = detectRace(rig);
    var raceMap = RACE_TEXTURES[race] || RACE_TEXTURES.elf_f || RACE_TEXTURES.human_fighter;

    var parts = ['chest', 'legs', 'gloves', 'boots'];
    for(var i = 0; i < parts.length; i++){
      var p = parts[i];
      var m = rig._meshParts[p];
      if(!m || !m.material) continue;

      var matList = Array.isArray(m.material) ? m.material : [m.material];
      matList.forEach(function(mat){
        if(!mat._origMap && mat.map){
          mat._origMap = mat.map; // salva o mapa original nativo do GLB
        }
      });

      var itUid = equip && equip[p];
      var it = itUid && findItem ? findItem(itUid) : null;
      var b = it && baseOf ? baseOf(it.base) : null;
      var grau = (b && b.grau) || 'sem';

      // Se o peitoral for inteiriço ou o slot secundário não tiver peça própria, herda o grau do peitoral
      if(p !== 'chest' && grau === 'sem' && equip && equip.chest && findItem && baseOf){
        var chestIt = findItem(equip.chest);
        var chestB = chestIt && baseOf(chestIt.base);
        if(chestB && chestB.grau) grau = chestB.grau;
      }

      if(grau === 'sem'){
        // Desequipado: restaura a textura e material originais nativos do personagem
        matList.forEach(function(mat){
          if(mat._origMap && mat.map !== mat._origMap){
            mat.map = mat._origMap;
            mat.transparent = false;
            mat.alphaTest = 0;
            mat.opacity = 1.0;
            mat.depthWrite = true;
            mat.needsUpdate = true;
          }
        });
      } else {
        // Equipado: aplica a textura oficial da armadura L2 da raça
        var setConf = raceMap && raceMap[grau];
        var texPath = setConf && setConf[p];
        if(texPath){
          var tex = getTex(texPath);
          if(tex){
            matList.forEach(function(mat){
              if(mat.map !== tex){
                mat.map = tex;
                mat.transparent = false;
                mat.alphaTest = 0;
                mat.opacity = 1.0;
                mat.depthWrite = true;
                mat.needsUpdate = true;
              }
            });
          }
        }
      }
    }
  };

  A.conjunto = function(ITM, equip, baseOf, findItem){
    var C = ITM && ITM.conjunto; if(!C || !equip) return null;

    // 1. Checa se formou um Set Específico (ex: brigandine, fullplate, doom, tallum)
    if(C.sets){
      for(var sKey in C.sets){
        var sDef = C.sets[sKey];
        var match = true;
        for(var pi = 0; pi < sDef.pecas.length; pi++){
          var pSlot = sDef.pecas[pi];
          var itP = findItem(equip[pSlot]), bP = itP && baseOf(itP.base);
          if(!bP || (bP.set !== sKey && (bP.grau !== sDef.grau))){ match = false; break; }
        }
        if(match){
          return {
            grau: sDef.grau,
            nome: sDef.nome,
            vida: sDef.vida || 0,
            dano: sDef.dano || 0,
            defesa: sDef.defesa || 0
          };
        }
      }
    }

    // 2. Fallback: Checa conjunto por Grau de peças equipadas
    var g = null;
    for(var i = 0; i < C.pecas.length; i++){
      var it = findItem(equip[C.pecas[i]]), b = it && baseOf(it.base);
      if(!b) return null;
      var gb = b.grau || 'sem';
      if(g === null) g = gb;
      else if(g !== gb) return null;
    }
    var B = C[g]; if(!B) return null;
    return {
      grau: g,
      nome: B.name || ('Conjunto Grau ' + g),
      vida: B.vida || 0,
      dano: B.dano || 0,
      defesa: B.defesa || 0
    };
  };

  A.info = function(ITM, b){
    var G = ITM && ITM.graus, g = (b && b.grau) || 'sem';
    return (G && G[g]) || { name: 'Sem grau', css: '#9aa4b8', nivel: 1 };
  };

  A.tag = function(ITM, b, nivel){
    var G = A.info(ITM, b), falta = (G.nivel | 0) > (nivel | 0);
    return '<span style="color:' + G.css + '">' + G.name + '</span>' + ((G.nivel | 0) > 1 ? ' <span style="color:' + (falta ? '#ff6a5a' : '#9fb0cc') + '">Nv ' + G.nivel + '</span>' : '');
  };
  A.detectRace = detectRace;

  A.SET_3D_MODELS = {
    elf_f: {
      naked: 'assets/personagens/elf_f.glb?v=9',
      sem:   'assets/personagens/elf_f_nograde.glb?v=2',
      D:     'assets/personagens/elf_f_brigandine.glb?v=2',
      C:     'assets/personagens/elf_f_fullplate.glb?v=2',
      B:     'assets/personagens/elf_f_doom.glb?v=2',
      A:     'assets/personagens/elf_f_tallum.glb?v=2'
    },
    human_fighter: {
      naked: 'assets/personagens/human_fighter.glb?v=9',
      sem:   'assets/personagens/human_fighter_nograde.glb?v=2',
      D:     'assets/personagens/human_fighter_brigandine.glb?v=2',
      C:     'assets/personagens/human_fighter_fullplate.glb?v=2',
      A:     'assets/personagens/human_fighter_imperial.glb?v=2'
    }
  };

  A.obterModelo3D = function(race, grau, hasChest){
    var r = (race || 'elf_f').toLowerCase();
    if(r === 'fighter' || r === 'starter') r = 'human_fighter';
    var table = A.SET_3D_MODELS[r];
    if(!table) return null;
    if(hasChest === false){
      return table['naked'] || table['sem'] || null;
    }
    if(!grau || grau === 'sem'){
      return table['sem'] || table['naked'] || null;
    }
    return table[grau] || table['sem'] || null;
  };
})();
