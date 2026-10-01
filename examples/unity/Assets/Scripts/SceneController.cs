using System;
using System.Collections;
using System.Globalization;
using System.IO;
using System.Text;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

// Runtime for the sample scene: the fox paces in front of the fire, the courier walks a short beat, the fire light
// flickers, P or a click plays the pickup. With `-verify -out <dir>` it samples state, saves a screenshot, writes a
// report (including every error or exception the log raised during the run) and quits.
public class SceneController : MonoBehaviour
{
    const float FoxFacing = 1f; // +1 or -1: which way the model's forward axis points along its local Z after the glTF import

    public Transform foxPivot;
    public Animator foxAnimator;
    public AnimationClip walkClip;
    public Flipbook fire;
    public Flipbook courier;
    public Light fireLight;
    public AudioSource music;
    public PickupPlayer pickup;

    float t;
    float walkT;
    float heading = 90f;
    PlayableGraph graph;
    AnimationClipPlayable walkPlayable;
    int logErrors;
    int logWarnings;
    StringBuilder logLines = new StringBuilder();

    void Awake()
    {
        Application.logMessageReceived += OnLog;
    }

    void Start()
    {
        // glTFast gives the fox an Animator with no controller and non-legacy clips, so play the clip through a
        // PlayableGraph and loop it by wrapping the time ourselves
        graph = PlayableGraph.Create("fox");
        var output = AnimationPlayableOutput.Create(graph, "fox", foxAnimator);
        walkPlayable = AnimationClipPlayable.Create(graph, walkClip);
        walkPlayable.SetSpeed(0.0);
        output.SetSourcePlayable(walkPlayable);
        graph.Play();
        music.loop = true;
        music.Play();
        string[] args = Environment.GetCommandLineArgs();
        if (Array.IndexOf(args, "-verify") >= 0)
        {
            int i = Array.IndexOf(args, "-out");
            string dir = i >= 0 && i + 1 < args.Length ? args[i + 1] : ".";
            StartCoroutine(Verify(dir));
        }
    }

    void Update()
    {
        t += Time.deltaTime;
        walkT = (walkT + Time.deltaTime) % walkClip.length;
        walkPlayable.SetTime(walkT);
        float phase = t * 0.5f;
        foxPivot.position = new Vector3(2f * Mathf.Sin(phase) - 1f, 0f, -2f);
        float target = (Mathf.Cos(phase) >= 0f ? 1f : -1f) * 90f * FoxFacing;
        heading = Mathf.LerpAngle(heading, target, Mathf.Min(1f, Time.deltaTime * 4f));
        foxPivot.rotation = Quaternion.Euler(0f, heading, 0f);
        courier.transform.position = new Vector3(3f + (Mathf.Sin(t * 0.55f) + 1f) / 2f * 0.8f, 0f, -0.6f);
        fireLight.intensity = 3f * (0.85f + 0.12f * Mathf.Sin(t * 17f) + 0.06f * Mathf.Sin(t * 31f + 1f) + 0.05f * Mathf.Sin(t * 7f));
        if (Input.GetKeyDown(KeyCode.P) || Input.GetMouseButtonDown(0)) pickup.Play();
    }

    void OnDestroy()
    {
        Application.logMessageReceived -= OnLog;
        if (graph.IsValid()) graph.Destroy();
    }

    void OnLog(string message, string stack, LogType type)
    {
        if (type == LogType.Error || type == LogType.Exception || type == LogType.Assert)
        {
            logErrors++;
            if (logLines.Length < 4000) logLines.Append(type).Append(": ").Append(message).Append('\n');
        }
        else if (type == LogType.Warning) logWarnings++;
    }

    static string F(float v) { return v.ToString("0.###", CultureInfo.InvariantCulture); }
    static string Q(string s) { return "\"" + s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n") + "\""; }

    string Sample()
    {
        return "{\"fox\":{\"playing\":" + (graph.IsPlaying() ? "true" : "false") + ",\"time\":" + F((float)walkPlayable.GetTime()) + ",\"length\":" + F(walkClip.length)
            + ",\"clip\":" + Q(walkClip.name) + ",\"x\":" + F(foxPivot.position.x) + "},"
            + "\"fire\":{\"frame\":" + fire.FrameIndex + ",\"frames\":" + fire.FrameCount + ",\"fps\":" + F(fire.FramesPerSecondOfFirst) + "},"
            + "\"courier\":{\"frame\":" + courier.FrameIndex + ",\"frames\":" + courier.FrameCount + ",\"fps\":" + F(courier.FramesPerSecondOfFirst) + ",\"x\":" + F(courier.transform.position.x) + "},"
            + "\"music\":{\"playing\":" + (music.isPlaying ? "true" : "false") + ",\"loop\":" + (music.loop ? "true" : "false") + ",\"time\":" + F(music.time)
            + ",\"length\":" + F(music.clip.length) + ",\"frequency\":" + music.clip.frequency + "}}";
    }

    IEnumerator Verify(string dir)
    {
        var sb = new StringBuilder("{");
        sb.Append("\"unity\":").Append(Q(Application.unityVersion)).Append(",\"device\":").Append(Q(SystemInfo.graphicsDeviceName))
          .Append(",\"api\":").Append(Q(SystemInfo.graphicsDeviceType.ToString())).Append(",");
        yield return new WaitForSeconds(3f);
        sb.Append("\"sample_a\":").Append(Sample()).Append(",");
        yield return new WaitForSeconds(1.3f);
        sb.Append("\"sample_b\":").Append(Sample()).Append(",");
        yield return new WaitForEndOfFrame();
        // a -batchmode player has the GPU but no window, so render the camera into a texture instead of capturing the screen
        var rt = new RenderTexture(960, 540, 24, RenderTextureFormat.ARGB32);
        Camera cam = Camera.main;
        cam.targetTexture = rt;
        cam.Render();
        cam.targetTexture = null;
        RenderTexture.active = rt;
        var shot = new Texture2D(rt.width, rt.height, TextureFormat.RGB24, false);
        shot.ReadPixels(new Rect(0, 0, rt.width, rt.height), 0, 0);
        shot.Apply();
        RenderTexture.active = null;
        File.WriteAllBytes(Path.Combine(dir, "unity-scene.png"), shot.EncodeToPNG());
        sb.Append("\"screenshot\":{\"width\":").Append(shot.width).Append(",\"height\":").Append(shot.height).Append("},");
        // twelve pickups, spaced out; this picker is ours, so the chosen variant is recorded
        var seq = new StringBuilder("[");
        var names = new System.Collections.Generic.List<string>();
        for (int k = 0; k < 12; k++)
        {
            names.Add(pickup.Play());
            yield return new WaitForSeconds(0.25f);
        }
        bool noRepeat = true;
        var distinct = new System.Collections.Generic.HashSet<string>(names);
        for (int k = 0; k < names.Count; k++)
        {
            if (k > 0) { seq.Append(','); if (names[k] == names[k - 1]) noRepeat = false; }
            seq.Append(Q(names[k]));
        }
        seq.Append("]");
        sb.Append("\"pickups\":{\"sequence\":").Append(seq).Append(",\"noImmediateRepeat\":").Append(noRepeat ? "true" : "false")
          .Append(",\"distinct\":").Append(distinct.Count).Append("},");
        sb.Append("\"sample_c\":").Append(Sample()).Append(",");
        sb.Append("\"log\":{\"errors\":").Append(logErrors).Append(",\"warnings\":").Append(logWarnings).Append(",\"lines\":").Append(Q(logLines.ToString())).Append("}}");
        File.WriteAllText(Path.Combine(dir, "unity-report.json"), sb.ToString());
        Application.Quit();
    }
}
