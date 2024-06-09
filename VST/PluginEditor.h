// PluginEditor.h

#pragma once

#include "JuceHeader.h"
#include "include_juce_audio_processors.cpp"

class GuitarFretboardComponent : public juce::Component
{
public:
    GuitarFretboardComponent();
    void paint(juce::Graphics&) override;
    void resized() override;
    void mouseDown(const juce::MouseEvent& event) override;

private:
    std::vector<std::pair<int, int>> selectedNotes; // Store selected string and fret pairs
    void toggleNoteSelection(int string, int fret);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(GuitarFretboardComponent)
};

class PluginEditor  : public juce::AudioProcessorEditor
{
public:
    PluginEditor (AudioProcessorEditor&);
    ~PluginEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;

private:
    GuitarFretboardComponent fretboardComponent;
    juce::TextButton saveButton;
    juce::TextButton loadButton;
    juce::TextButton stopButton;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PluginEditor)
};
