from pathlib import Path
p=Path('scripts/build_hallway.py')
s=p.read_text()
s=s.replace('import bpy,math,json','import bpy,math,json,random')
pos=s.index('\ndef box(')
s=s[:pos]+'''
# Image-based materials survive glTF export; procedural nodes alone do not.
def surface(material, base, variation, weave=False):
 material=material.copy(); material.name='Hall textured '+material.name
 image=bpy.data.images.new(material.name+' surface',width=256,height=256)
 rng=random.Random(42); pixels=[]
 for y in range(256):
  for x in range(256):
   grain=rng.uniform(-1,1)*.35 + math.sin(x*.09)*math.sin(y*.065)*.35
   if weave: grain += (.3 if x%4<2 else -.3)+(.2 if y%4<2 else -.2)
   pixels.extend([max(0,min(1,c+grain*variation)) for c in base]+[1])
 image.pixels.foreach_set(pixels);image.pack()
 nodes=material.node_tree.nodes; shader=nodes.get('Principled BSDF')
 tex=nodes.new('ShaderNodeTexImage');tex.image=image
 material.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
 shader.inputs['Roughness'].default_value=.83
 return material
plaster=surface(plaster,(.64,.60,.51),.055)
stone=surface(stone,(.065,.075,.063),.025)
fabric=surface(fabric,(.12,.14,.095),.035,True)
# Diffuse daylight glass, avoiding the luminous white panel effect.
p=glass.node_tree.nodes.get('Principled BSDF')
p.inputs['Base Color'].default_value=(.42,.51,.49,1)
p.inputs['Emission Color'].default_value=(.55,.64,.66,1)
p.inputs['Emission Strength'].default_value=.12
p.inputs['Roughness'].default_value=.38
''' + s[pos:]
s=s.replace("for y in [-20,-18.75,-17.5,-16.25,-15]:box('Hall_WindowMullion',(4.82,y,.8),(.12,.08,3.5),brass)","""# Recessed painted timber frame, substantial sill and matching architrave.
for y in [-20,-15]:
 box('Hall_WindowJamb',(4.91,y,.8),(.34,.18,3.58),trim)
 box('Hall_WindowCasing',(4.73,y,.8),(.12,.24,3.8),trim)
for z in [-.9,2.5]:box('Hall_WindowFrame',(4.91,-17.5,z),(.34,5.18,.18),trim)
box('Hall_WindowSill',(4.64,-17.5,-1.02),(.76,5.48,.18),trim,.035)
box('Hall_WindowApron',(4.77,-17.5,-1.20),(.12,5.25,.2),trim)
box('Hall_WindowLintel',(4.73,-17.5,2.63),(.14,5.48,.18),trim)
for y in [-18.75,-17.5,-16.25]:box('Hall_WindowMullion',(4.91,y,.8),(.16,.065,3.3),trim)""")
s=s.replace("for z in [-.9,.8,2.5]:box('Hall_WindowRail',(4.82,-17.5,z),(.12,5.15,.09),trim)","box('Hall_WindowRail',(4.91,-17.5,.8),(.16,5,.065),trim)")
p.write_text(s)
