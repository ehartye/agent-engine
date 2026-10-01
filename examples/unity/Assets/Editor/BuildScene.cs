using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

// Batch entry points, run with -batchmode -executeMethod:
//   BuildScene.Probe   writes probe.json describing what glTFast made of the fox
//   BuildScene.Build   builds Assets/Scenes/Sample.unity and the Windows player in Build/, writes build-report.json
public static class BuildScene
{
    const string Fox = "Assets/Meshes/fox.glb";

    static string Q(string s) { return "\"" + s.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\""; }

    static void Write(string name, string json) { File.WriteAllText(Path.Combine(Directory.GetCurrentDirectory(), name), json); }

    static void ConfigureTexture(string path)
    {
        var ti = (TextureImporter)AssetImporter.GetAtPath(path);
        ti.filterMode = FilterMode.Point;
        // the default texture type rescales a non-power-of-two sheet (256x40, 96x32) to a power of two, which squashes and blurs pixel art
        ti.npotScale = TextureImporterNPOTScale.None;
        ti.textureCompression = TextureImporterCompression.Uncompressed;
        ti.mipmapEnabled = false;
        ti.alphaIsTransparency = true;
        ti.wrapMode = TextureWrapMode.Clamp;
        ti.SaveAndReimport();
    }

    public static void Probe()
    {
        AssetDatabase.Refresh();
        var go = AssetDatabase.LoadAssetAtPath<GameObject>(Fox);
        var sb = new StringBuilder("{");
        if (go == null) { sb.Append("\"error\":\"fox.glb did not import as a GameObject\"}"); Write("probe.json", sb.ToString()); return; }
        var skinned = go.GetComponentsInChildren<SkinnedMeshRenderer>(true);
        var meshes = go.GetComponentsInChildren<MeshRenderer>(true);
        var clips = AssetDatabase.LoadAllAssetsAtPath(Fox).OfType<AnimationClip>().ToArray();
        var bounds = new Bounds();
        bool first = true;
        foreach (var r in go.GetComponentsInChildren<Renderer>(true)) { if (first) { bounds = r.bounds; first = false; } else bounds.Encapsulate(r.bounds); }
        var bones = new HashSet<Transform>();
        foreach (var s in skinned) foreach (var b in s.bones) if (b != null) bones.Add(b);
        sb.Append("\"skinnedMeshRenderers\":").Append(skinned.Length).Append(",\"meshRenderers\":").Append(meshes.Length)
          .Append(",\"distinctBones\":").Append(bones.Count)
          .Append(",\"hasAnimation\":").Append(go.GetComponentInChildren<Animation>(true) != null ? "true" : "false")
          .Append(",\"hasAnimator\":").Append(go.GetComponentInChildren<Animator>(true) != null ? "true" : "false")
          .Append(",\"boundsSize\":[").Append(bounds.size.x.ToString("0.00")).Append(',').Append(bounds.size.y.ToString("0.00")).Append(',').Append(bounds.size.z.ToString("0.00")).Append("]")
          .Append(",\"clips\":[");
        for (int i = 0; i < clips.Length; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append("{\"name\":").Append(Q(clips[i].name)).Append(",\"length\":").Append(clips[i].length.ToString("0.###")).Append(",\"legacy\":").Append(clips[i].legacy ? "true" : "false")
              .Append(",\"loopTime\":").Append(clips[i].isLooping ? "true" : "false").Append('}');
        }
        sb.Append("],\"controllers\":[");
        var animator = go.GetComponentInChildren<Animator>(true);
        sb.Append(Q(animator != null && animator.runtimeAnimatorController != null ? animator.runtimeAnimatorController.name : "(none on the prefab Animator)")).Append("],\"controllerAssets\":[");
        var controllers = AssetDatabase.LoadAllAssetsAtPath(Fox).OfType<UnityEditor.Animations.AnimatorController>().ToArray();
        for (int i = 0; i < controllers.Length; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append("{\"name\":").Append(Q(controllers[i].name)).Append(",\"states\":[");
            var states = controllers[i].layers.SelectMany(l => l.stateMachine.states).Select(st => st.state).ToArray();
            for (int k = 0; k < states.Length; k++) { if (k > 0) sb.Append(','); sb.Append(Q(states[k].name)); }
            sb.Append("]}");
        }
        sb.Append("]}");
        Write("probe.json", sb.ToString());
    }

    public static void Build()
    {
        AssetDatabase.Refresh();
        foreach (var p in new[] { "Assets/Sprites/campfire.png", "Assets/Sprites/courier.png" }) ConfigureTexture(p);
        Directory.CreateDirectory("Assets/Scenes");
        Directory.CreateDirectory("Assets/Materials");

        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        // camera, ambient light and sky colour
        var camGo = new GameObject("Camera");
        camGo.tag = "MainCamera";
        var cam = camGo.AddComponent<Camera>();
        cam.fieldOfView = 38f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.043f, 0.063f, 0.188f);
        cam.nearClipPlane = 0.1f;
        cam.farClipPlane = 80f;
        camGo.AddComponent<AudioListener>();
        // Unity is left-handed: a camera on +Z looking at the origin shows +X on the left, mirroring the other builds,
        // so the camera sits on -Z and the layout below uses negative Z for "in front of the fire"
        camGo.transform.position = new Vector3(0f, 2.1f, -8.2f);
        camGo.transform.rotation = Quaternion.LookRotation(new Vector3(0f, 0.9f, 0f) - camGo.transform.position);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.45f, 0.52f, 0.85f) * 0.7f;

        var moon = new GameObject("Moon").AddComponent<Light>();
        moon.type = LightType.Directional;
        moon.color = new Color(0.62f, 0.7f, 1f);
        moon.intensity = 0.9f;
        moon.transform.rotation = Quaternion.Euler(50f, -35f, 0f);

        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "Ground";
        ground.transform.localScale = new Vector3(6f, 1f, 6f);
        var gm = new Material(Shader.Find("Standard")) { color = new Color(0.105f, 0.13f, 0.28f) };
        gm.SetFloat("_Glossiness", 0.05f);
        AssetDatabase.CreateAsset(gm, "Assets/Materials/Ground.mat");
        ground.GetComponent<MeshRenderer>().sharedMaterial = gm;

        var fireLight = new GameObject("FireLight").AddComponent<Light>();
        fireLight.type = LightType.Point;
        fireLight.color = new Color(1f, 0.54f, 0.16f);
        fireLight.intensity = 3f;
        fireLight.range = 11f;
        fireLight.transform.position = new Vector3(0f, 1.3f, -0.9f);

        // billboards cut from the atlases
        Flipbook MakeFlipbook(string name, string tex, string atlas, string tag, float height, Vector3 pos)
        {
            var go = new GameObject(name);
            go.AddComponent<SpriteRenderer>();
            var fb = go.AddComponent<Flipbook>();
            fb.texture = AssetDatabase.LoadAssetAtPath<Texture2D>(tex);
            fb.atlas = AssetDatabase.LoadAssetAtPath<TextAsset>(atlas);
            fb.tag = tag;
            fb.heightUnits = height;
            go.transform.position = pos;
            return fb;
        }
        var fire = MakeFlipbook("Fire", "Assets/Sprites/campfire.png", "Assets/Sprites/campfire.atlas.json", "burn", 2.6f, Vector3.zero);
        var courier = MakeFlipbook("Courier", "Assets/Sprites/courier.png", "Assets/Sprites/courier.atlas.json", "walk", 1.7f, new Vector3(3f, 0f, -0.6f));

        // the fox, normalised to the height the other builds use (the source is 2.22 units tall)
        var pivot = new GameObject("FoxPivot").transform;
        var fox = (GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(Fox));
        fox.name = "Fox";
        fox.transform.SetParent(pivot, false);
        var b = new Bounds();
        bool first = true;
        foreach (var r in fox.GetComponentsInChildren<Renderer>()) { if (first) { b = r.bounds; first = false; } else b.Encapsulate(r.bounds); }
        float s = 1.35f / b.size.y;
        fox.transform.localScale = Vector3.one * s;
        b = new Bounds();
        first = true;
        foreach (var r in fox.GetComponentsInChildren<Renderer>()) { if (first) { b = r.bounds; first = false; } else b.Encapsulate(r.bounds); }
        fox.transform.position += Vector3.up * (-b.min.y);
        var foxAnimator = fox.GetComponentInChildren<Animator>();
        var walkClip = AssetDatabase.LoadAllAssetsAtPath(Fox).OfType<AnimationClip>().First(c => c.name == "walk");

        // audio: the music bed (looped by the AudioSource) and the pickup variants from the agent-beeps manifest
        var musicSrc = new GameObject("Music").AddComponent<AudioSource>();
        musicSrc.clip = AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/Audio/survey-drone.wav");
        musicSrc.playOnAwake = false;
        musicSrc.loop = true;
        musicSrc.spatialBlend = 0f;
        var pickupGo = new GameObject("Pickup");
        var pickupSrc = pickupGo.AddComponent<AudioSource>();
        pickupSrc.playOnAwake = false;
        pickupSrc.spatialBlend = 0f;
        var pickup = pickupGo.AddComponent<PickupPlayer>();
        var manifest = JsonUtility.FromJson<Manifest>(File.ReadAllText("Assets/Audio/relic-discovered.wav.json"));
        pickup.source = pickupSrc;
        pickup.noRepeat = manifest.noRepeat;
        pickup.clips = manifest.variants.Select(v => AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/Audio/" + v.file)).ToArray();
        pickup.weights = manifest.variants.Select(v => v.weight <= 0f ? 1f : v.weight).ToArray();

        var ctl = new GameObject("Controller").AddComponent<SceneController>();
        ctl.foxPivot = pivot;
        ctl.foxAnimator = foxAnimator;
        ctl.walkClip = walkClip;
        ctl.fire = fire;
        ctl.courier = courier;
        ctl.fireLight = fireLight;
        ctl.music = musicSrc;
        ctl.pickup = pickup;

        EditorSceneManager.SaveScene(scene, "Assets/Scenes/Sample.unity");
        PlayerSettings.productName = "agent-engine sample scene";
        PlayerSettings.defaultScreenWidth = 960;
        PlayerSettings.defaultScreenHeight = 540;
        PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
        PlayerSettings.runInBackground = true;
        // the default Windows list is D3D12 only, so -force-vulkan / -force-d3d11 fail with "shaders will not be available"
        PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.StandaloneWindows64, false);
        PlayerSettings.SetGraphicsAPIs(BuildTarget.StandaloneWindows64, new[]
        {
            UnityEngine.Rendering.GraphicsDeviceType.Direct3D12,
            UnityEngine.Rendering.GraphicsDeviceType.Vulkan,
            UnityEngine.Rendering.GraphicsDeviceType.Direct3D11,
        });
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene("Assets/Scenes/Sample.unity", true) };

        var report = new StringBuilder("{");
        report.Append("\"unity\":").Append(Q(Application.unityVersion))
              .Append(",\"foxScale\":").Append(s.ToString("0.####"))
              .Append(",\"foxHasAnimator\":").Append(foxAnimator != null ? "true" : "false")
              .Append(",\"pickupVariants\":").Append(pickup.clips.Length)
              .Append(",\"pickupNoRepeat\":").Append(pickup.noRepeat ? "true" : "false")
              .Append(",\"fireFrames\":").Append("\"built at runtime from the atlas\"");
        if (Array.IndexOf(Environment.GetCommandLineArgs(), "-buildPlayer") >= 0)
        {
            var opts = new BuildPlayerOptions
            {
                scenes = new[] { "Assets/Scenes/Sample.unity" },
                locationPathName = "Build/SampleScene.exe",
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None,
            };
            BuildReport br = BuildPipeline.BuildPlayer(opts);
            report.Append(",\"player\":{\"result\":").Append(Q(br.summary.result.ToString()))
                  .Append(",\"errors\":").Append(br.summary.totalErrors)
                  .Append(",\"warnings\":").Append(br.summary.totalWarnings)
                  .Append(",\"seconds\":").Append(((int)br.summary.totalTime.TotalSeconds))
                  .Append(",\"sizeMB\":").Append((br.summary.totalSize / 1048576).ToString()).Append("}");
        }
        report.Append("}");
        Write("build-report.json", report.ToString());
    }

    [Serializable] class Variant { public string file; public float weight; }
    [Serializable] class Manifest { public bool noRepeat = true; public Variant[] variants; }
}
