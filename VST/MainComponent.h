#pragma once

#include <JuceHeader.h>

class MainComponent : public juce::AudioProcessorEditor, private juce::Button::Listener
{
public:
    MainComponent(juce::AudioProcessor&);
    ~MainComponent() override;

    void paint(juce::Graphics&) override;
    void resized() override;
    void buttonClicked(juce::Button*) override;

private:
    void initializeFretboard();
    void playSoundFrequency(double frequency);
    double calculateFrequency(int string, int fret);

    juce::TextButton saveButton;
    juce::TextButton loadButton;
    juce::TextButton stopButton;
    juce::OwnedArray<juce::ToggleButton> fretButtons;
    juce::AudioProcessor& processor;
    std::unique_ptr<juce::AudioFormatWriter> writer;
    juce::AudioFormatManager formatManager;
    juce::File saveFile;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MainComponent)
};
