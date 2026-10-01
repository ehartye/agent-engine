extends Node3D
# Runtime for the sample scene: the fox paces in front of the fire, the courier walks a short beat, the fire light
# flickers, the walk clip and the music loop are set explicitly (the imports do not loop on their own), and P or a
# click plays the pickup. With `-- --verify --out <dir>` it samples state, saves a screenshot, writes a report and quits.

const FOX_FACING := 1.0  # +1 or -1: which way the model's forward axis points along its local Z after the GLB import

var t := 0.0
var heading := PI / 2.0
var fox_anim: AnimationPlayer
var out_dir := ""
var pickup_log: Array = []

@onready var fox_pivot: Node3D = $FoxPivot
@onready var fire: AnimatedSprite3D = $Fire
@onready var courier: AnimatedSprite3D = $Courier
@onready var fire_light: OmniLight3D = $FireLight
@onready var music: AudioStreamPlayer = $Music
@onready var pickup: AudioStreamPlayer = $Pickup

func _ready() -> void:
	fox_anim = $FoxPivot/Fox.find_child("AnimationPlayer", true, false) as AnimationPlayer
	# glTF clips import without a loop (Godot loops only clips whose name carries a -loop suffix)
	fox_anim.get_animation("walk").loop_mode = Animation.LOOP_LINEAR
	fox_anim.play("walk")
	fire.play("burn")
	courier.play("walk")
	var bed := music.stream as AudioStreamWAV
	# the music WAV has no loop chunk, so "Detect from WAV" would not loop it: loop the whole sample. Godot may import
	# the data compressed, so derive the frame count from length and mix rate, not from the byte size of data.
	bed.loop_mode = AudioStreamWAV.LOOP_FORWARD
	bed.loop_begin = 0
	bed.loop_end = int(round(bed.get_length() * bed.mix_rate))
	music.play()
	pickup.max_polyphony = 8
	var args := OS.get_cmdline_user_args()
	if "--verify" in args:
		var i := args.find("--out")
		out_dir = args[i + 1] if i >= 0 and i + 1 < args.size() else "."
		_run_verify.call_deferred()

func _process(delta: float) -> void:
	t += delta
	var phase := t * 0.5
	fox_pivot.position = Vector3(2.0 * sin(phase) - 1.0, 0, 2.0)
	var target := (1.0 if cos(phase) >= 0.0 else -1.0) * PI / 2.0 * FOX_FACING
	heading += (target - heading) * minf(1.0, delta * 4.0)
	fox_pivot.rotation.y = heading
	courier.position.x = 3.0 + (sin(t * 0.55) + 1.0) / 2.0 * 0.8
	fire_light.light_energy = 3.0 * (0.85 + 0.12 * sin(t * 17.0) + 0.06 * sin(t * 31.0 + 1.0) + 0.05 * sin(t * 7.0))

func _unhandled_input(event: InputEvent) -> void:
	if (event is InputEventKey and event.pressed and event.keycode == KEY_P) or (event is InputEventMouseButton and event.pressed):
		pickup.play()

func sample() -> Dictionary:
	var bed := music.stream as AudioStreamWAV
	return {
		"fox": {"anim": fox_anim.current_animation, "playing": fox_anim.is_playing(), "position": snappedf(fox_anim.current_animation_position, 0.001),
			"loop_mode": fox_anim.get_animation("walk").loop_mode, "x": snappedf(fox_pivot.position.x, 0.01)},
		"fire": {"anim": fire.animation, "frame": fire.frame, "frames": fire.sprite_frames.get_frame_count("burn"),
			"fps": fire.sprite_frames.get_animation_speed("burn"), "playing": fire.is_playing()},
		"courier": {"anim": courier.animation, "frame": courier.frame, "frames": courier.sprite_frames.get_frame_count("walk"),
			"fps": courier.sprite_frames.get_animation_speed("walk"), "playing": courier.is_playing(), "x": snappedf(courier.position.x, 0.01)},
		"music": {"playing": music.playing, "position": snappedf(music.get_playback_position(), 0.001), "loop_mode": bed.loop_mode,
			"loop_end": bed.loop_end, "length": snappedf(bed.get_length(), 0.1), "mix_rate": bed.mix_rate, "format": bed.format,
			"loop_end_seconds": snappedf(float(bed.loop_end) / float(bed.mix_rate), 0.1)},
	}

func _run_verify() -> void:
	var report := {"engine": Engine.get_version_info().string, "renderer": RenderingServer.get_video_adapter_name(),
		"rendering_method": ProjectSettings.get_setting("rendering/renderer/rendering_method")}
	await get_tree().create_timer(3.0).timeout
	report["sample_a"] = sample()
	await get_tree().create_timer(1.3).timeout
	report["sample_b"] = sample()
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	report["screenshot"] = {"saved": img.save_png(out_dir.path_join("godot-scene.png")) == OK, "size": [img.get_width(), img.get_height()]}
	# twelve pickups, spaced out; the randomizer picks the variant itself, so only that something plays is observable
	var rnd := pickup.stream as AudioStreamRandomizer
	var plays: Array = []
	for k in 12:
		pickup.play()
		await get_tree().create_timer(0.05).timeout
		plays.append(pickup.playing)
		await get_tree().create_timer(0.2).timeout
	report["pickups"] = {"all_started": not plays.has(false), "randomizer_streams": rnd.streams_count, "playback_mode": rnd.playback_mode}
	report["sample_c"] = sample()
	var f := FileAccess.open(out_dir.path_join("godot-report.json"), FileAccess.WRITE)
	f.store_string(JSON.stringify(report, "  "))
	f.close()
	get_tree().quit()
