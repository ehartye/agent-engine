using System.Collections.Generic;
using UnityEngine;

// Plays one of several rendered takes of a sound, honouring the agent-beeps manifest's weights and noRepeat.
// Unity has no randomizer component, so the picker is ours; unlike Godot's, the choice is observable.
public class PickupPlayer : MonoBehaviour
{
    public AudioSource source;
    public AudioClip[] clips;
    public float[] weights;
    public bool noRepeat = true;
    public List<string> log = new List<string>();

    int last = -1;

    public string Play()
    {
        int i = Pick();
        source.PlayOneShot(clips[i]);
        last = i;
        log.Add(clips[i].name);
        return clips[i].name;
    }

    int Pick()
    {
        float total = 0f;
        for (int i = 0; i < clips.Length; i++)
            if (!(noRepeat && clips.Length > 1 && i == last)) total += weights[i];
        float r = Random.value * total;
        for (int i = 0; i < clips.Length; i++)
        {
            if (noRepeat && clips.Length > 1 && i == last) continue;
            r -= weights[i];
            if (r <= 0f) return i;
        }
        return clips.Length - 1;
    }
}
