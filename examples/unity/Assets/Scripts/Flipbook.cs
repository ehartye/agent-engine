using System;
using UnityEngine;

// Cuts frames out of an agent-sprites atlas (Aseprite "array" JSON + PNG). Unity's Aseprite importer takes .aseprite
// files, not a sheet plus JSON, so the loader is ours. The tag's from/to index into the frames array, which also holds
// raw and named copies of the cells; frame index is not cell index.
[Serializable] class AtlasRect { public int x, y, w, h; }
[Serializable] class AtlasFrame { public string filename; public AtlasRect frame; public int duration; }
[Serializable] class AtlasTag { public string name; public int from, to; public string direction; }
[Serializable] class AtlasPoint { public int x, y; }
[Serializable] class AtlasKey { public AtlasPoint pivot; }
[Serializable] class AtlasSlice { public string name; public AtlasKey[] keys; }
[Serializable] class AtlasMeta { public AtlasTag[] frameTags; public AtlasSlice[] slices; }
[Serializable] class Atlas { public AtlasMeta meta; public AtlasFrame[] frames; }

[RequireComponent(typeof(SpriteRenderer))]
public class Flipbook : MonoBehaviour
{
    public Texture2D texture;
    public TextAsset atlas;
    public string tag = "burn";
    public float heightUnits = 2.6f;
    public bool billboard = true;

    public int FrameCount { get; private set; }
    public int FrameIndex { get; private set; }
    public float FramesPerSecondOfFirst { get; private set; }

    Sprite[] sprites;
    int[] durationsMs;
    int totalMs;
    float clock;
    SpriteRenderer sr;

    void Awake()
    {
        sr = GetComponent<SpriteRenderer>();
        var a = JsonUtility.FromJson<Atlas>(atlas.text);
        AtlasTag t = Array.Find(a.meta.frameTags, x => x.name == tag);
        AtlasPoint pivot = Array.Find(a.meta.slices, s => s.name == "pivot").keys[0].pivot;
        int n = t.to - t.from + 1;
        sprites = new Sprite[n];
        durationsMs = new int[n];
        for (int i = 0; i < n; i++)
        {
            AtlasFrame f = a.frames[t.from + i];
            // texture space in Unity starts at the bottom left; the atlas starts at the top left
            var rect = new Rect(f.frame.x, texture.height - f.frame.y - f.frame.h, f.frame.w, f.frame.h);
            // the atlas pivot is in cell pixels from the top left; Sprite.Create wants it normalised from the bottom left
            var pv = new Vector2((float)pivot.x / f.frame.w, 1f - (float)pivot.y / f.frame.h);
            sprites[i] = Sprite.Create(texture, rect, pv, f.frame.h / heightUnits, 0, SpriteMeshType.FullRect);
            durationsMs[i] = f.duration;
            totalMs += f.duration;
        }
        FrameCount = n;
        FramesPerSecondOfFirst = 1000f / durationsMs[0];
        Show(0);
    }

    void Update()
    {
        clock += Time.deltaTime * 1000f;
        float t = clock % totalMs;
        int i = 0;
        while (t >= durationsMs[i]) { t -= durationsMs[i]; i++; }
        if (i != FrameIndex) Show(i);
    }

    void LateUpdate()
    {
        if (billboard && Camera.main != null)
            transform.rotation = Quaternion.Euler(0f, Camera.main.transform.eulerAngles.y, 0f);
    }

    void Show(int i) { FrameIndex = i; sr.sprite = sprites[i]; }
}
