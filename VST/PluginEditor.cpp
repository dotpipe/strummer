// PluginEditor.cpp

#include "PluginEditor.h"

GuitarFretboardComponent::GuitarFretboardComponent()
{
}

void GuitarFretboardComponent::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colours::white);

    for (int string = 0; string < 6; ++string)
    {
        for (int fret = 0; fret < 24; ++fret)
        {
            juce::Rectangle<float> fretRect((float)fret * 20, (float)string * 20, 20.0f, 20.0f);
            g.setColour(juce::Colours::black);
            g.drawRect(fretRect);

            if (std::find(selectedNotes.begin(), selectedNotes.end(), std::make_pair(string, fret)) != selectedNotes.end())
            {
                g.setColour(juce::Colours::yellow);
                g.fillEllipse(fretRect.reduced(4));
            }
        }
    }
}

void GuitarFretboardComponent::resized()
{
}

void GuitarFretboardComponent::mouseDown(const juce::MouseEvent& event)
{
    int string = event.y / 20;
    int fret = event.x / 20;
    toggleNoteSelection(string, fret);
    repaint();
}

void GuitarFretboardComponent::toggleNoteSelection(int string, int fret)
{
    auto note = std::make_pair(string, fret);
    auto it = std::find(selectedNotes.begin(), selectedNotes.end(), note);
    if (it != selectedNotes.end())
        selectedNotes.erase(it);
    else
        selectedNotes.push_back(note);
}

PluginEditor::PluginEditor(AudioProcessor& p)
    : AudioProcessorEditor(&p), fretboardComponent(), saveButton("Save"), loadButton("Load"), stopButton("Stop")
{
    addAndMakeVisible(fretboardComponent);
    addAndMakeVisible(saveButton);
    addAndMakeVisible(loadButton);
    addAndMakeVisible(stopButton);

    saveButton.onClick = [this] { /* Save state logic */ };
    loadButton.onClick = [this] { /* Load state logic */ };
    stopButton.onClick = [this] { /* Stop playback logic */ };

    setSize(800, 400);
}

PluginEditor::~PluginEditor()
{
}

void PluginEditor::paint(juce::Graphics& g)
{
    g.fillAll(getLookAndFeel().findColour(juce::ResizableWindow::backgroundColourId));
}

void PluginEditor::resized()
{
    fretboardComponent.setBounds(10, 10, 480, 120);
    saveButton.setBounds(10, 140, 100, 30);
    loadButton.setBounds(120, 140, 100, 30);
    stopButton.setBounds(230, 140, 100, 30);
}
