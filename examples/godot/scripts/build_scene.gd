extends SceneTree
# Builds res://scenes/sample.tscn from the imported assets. Run headless after an import:
#   godot --headless --path <project> --import
#   godot --headless --path <project> --script res://scripts/build_scene.gd
# Writes res://build-report.json describing each step. Nothing here claims the scene renders or plays.

var report := {"engine": Engine.get_version_info().string, "steps": []}

func step(name: String, ok: bool, detail: Variant = null) -> void:
	report.steps.append({"name": name, "ok": ok, "detail": detail})
	print("[build] ", "ok   " if ok else "FAIL ", name)

func read_json(path: String) -> Variant:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return null
	return JSON.parse_string(f.get_as_text())

# Godot has no sprite-sheet importer, so cut SpriteFrames out of the agent-sprites atlas ourselves.
# The tag's from/to index into the atlas "frames" array (which also holds raw and named copies of the cells).
func make_frames(png: String, atlas_path: String, tag_name: String, anim: String, save_to: String) -> Dictionary:
	var atlas: Dictionary = read_json(atlas_path)
	var tex: Texture2D = load(png)
	var tag: Dictionary = {}
	for t in atlas.meta.frameTags:
		if t.name == tag_name:
			tag = t
	var pivot: Dictionary = {}
	for s in atlas.meta.slices:
		if s.name == "pivot":
			pivot = s.keys[0].pivot
	var frames: Array = atlas.frames.slice(int(tag.from), int(tag.to) + 1)
	var first_ms: float = frames[0].duration
	var fps: float = 1000.0 / first_ms
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	sf.add_animation(anim)
	sf.set_animation_speed(anim, fps)
	sf.set_animation_loop(anim, true)
	for f in frames:
		var at := AtlasTexture.new()
		at.atlas = tex
		at.region = Rect2(f.frame.x, f.frame.y, f.frame.w, f.frame.h)
		# per-frame duration is a multiplier of 1/fps, so uneven atlas durations survive
		sf.add_frame(anim, at, float(f.duration) / first_ms)
	ResourceSaver.save(sf, save_to)
	var cell: Dictionary = frames[0].frame
	return {"frames": frames.size(), "fps": fps, "cell": [cell.w, cell.h], "pivot": [pivot.x, pivot.y]}

func billboard(name: String, frames_path: String, anim: String, height_units: float, cell: Array, pivot: Array) -> AnimatedSprite3D:
	var s := AnimatedSprite3D.new()
	s.name = name
	s.sprite_frames = load(frames_path)
	s.animation = anim
	s.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	s.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	s.shaded = false
	s.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
	s.pixel_size = height_units / float(cell[1])
	s.centered = true
	# put the atlas pivot at the node origin: Godot's sprite is centred and +y is up, the atlas pivot is from the top left
	s.offset = Vector2(float(cell[0]) / 2.0 - float(pivot[0]), float(pivot[1]) - float(cell[1]) / 2.0)
	return s

func _init() -> void:
	var fire_info := make_frames("res://assets/sprites/campfire.png", "res://assets/sprites/campfire.atlas.json", "burn", "burn", "res://scenes/campfire_frames.tres")
	step("campfire SpriteFrames", fire_info.frames == 8, fire_info)
	var courier_info := make_frames("res://assets/sprites/courier.png", "res://assets/sprites/courier.atlas.json", "walk", "walk", "res://scenes/courier_frames.tres")
	step("courier SpriteFrames", courier_info.frames == 4, courier_info)

	var root := Node3D.new()
	root.name = "Sample"
	root.set_script(load("res://scripts/scene.gd"))

	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.043, 0.063, 0.188)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.45, 0.52, 0.85)
	env.ambient_light_energy = 0.7
	env.fog_enabled = true
	env.fog_light_color = Color(0.043, 0.063, 0.188)
	env.fog_density = 0.012
	var we := WorldEnvironment.new()
	we.name = "Environment"
	we.environment = env
	root.add_child(we)

	var moon := DirectionalLight3D.new()
	moon.name = "Moon"
	moon.light_color = Color(0.62, 0.7, 1.0)
	moon.light_energy = 0.9
	moon.rotation_degrees = Vector3(-50, -35, 0)
	root.add_child(moon)

	var ground := MeshInstance3D.new()
	ground.name = "Ground"
	var plane := PlaneMesh.new()
	plane.size = Vector2(60, 60)
	var gm := StandardMaterial3D.new()
	gm.albedo_color = Color(0.105, 0.13, 0.28)
	gm.roughness = 0.95
	plane.material = gm
	ground.mesh = plane
	root.add_child(ground)

	var fire := billboard("Fire", "res://scenes/campfire_frames.tres", "burn", 2.6, fire_info.cell, fire_info.pivot)
	root.add_child(fire)
	var courier := billboard("Courier", "res://scenes/courier_frames.tres", "walk", 1.7, courier_info.cell, courier_info.pivot)
	courier.position = Vector3(3.0, 0, 0.6)
	root.add_child(courier)

	var light := OmniLight3D.new()
	light.name = "FireLight"
	light.light_color = Color(1.0, 0.54, 0.16)
	light.light_energy = 3.0
	light.omni_range = 11.0
	light.position = Vector3(0, 1.3, 0.9)
	root.add_child(light)

	var pivot_node := Node3D.new()
	pivot_node.name = "FoxPivot"
	root.add_child(pivot_node)
	var fox_scene: PackedScene = load("res://assets/meshes/fox.glb")
	var fox: Node3D = fox_scene.instantiate()
	fox.name = "Fox"
	fox.scale = Vector3.ONE * (1.35 / 2.22)  # normalise the 2.22-unit source height, as the web build does
	pivot_node.add_child(fox)

	var cam := Camera3D.new()
	cam.name = "Camera"
	cam.fov = 38.0
	cam.position = Vector3(0, 2.1, 8.2)
	# look_at() needs the node inside the tree and silently does nothing before that, so aim by rotation
	cam.rotation_degrees = Vector3(-rad_to_deg(atan((2.1 - 0.9) / 8.2)), 0, 0)
	cam.current = true
	root.add_child(cam)

	# audio: the music bed and a randomizer built from the agent-beeps manifest (variants, weights, noRepeat)
	var music := AudioStreamPlayer.new()
	music.name = "Music"
	music.stream = load("res://assets/audio/survey-drone.wav")
	root.add_child(music)
	var manifest: Dictionary = read_json("res://assets/audio/relic-discovered.wav.json")
	var rnd := AudioStreamRandomizer.new()
	rnd.playback_mode = AudioStreamRandomizer.PLAYBACK_RANDOM_NO_REPEATS if manifest.get("noRepeat", true) else AudioStreamRandomizer.PLAYBACK_RANDOM
	var i := 0
	for v in manifest.variants:
		rnd.add_stream(i, load("res://assets/audio/" + v.file), float(v.get("weight", 1.0)))
		i += 1
	var pickup := AudioStreamPlayer.new()
	pickup.name = "Pickup"
	pickup.stream = rnd
	root.add_child(pickup)
	step("audio", rnd.streams_count == manifest.variants.size(), {"variants": rnd.streams_count, "noRepeat": manifest.get("noRepeat", true), "mode": rnd.playback_mode})

	# every node needs the root as owner or pack() drops it
	var stack: Array = []
	for c in root.get_children():
		stack.append(c)
	while stack.size() > 0:
		var n: Node = stack.pop_back()
		n.owner = root
		if n.scene_file_path == "":
			for c in n.get_children():
				stack.append(c)
	var packed := PackedScene.new()
	var pack_err := packed.pack(root)
	var save_err := ResourceSaver.save(packed, "res://scenes/sample.tscn")
	step("pack and save scene", pack_err == OK and save_err == OK, {"pack": pack_err, "save": save_err})

	var out := FileAccess.open("res://build-report.json", FileAccess.WRITE)
	out.store_string(JSON.stringify(report, "  "))
	out.close()
	quit()
