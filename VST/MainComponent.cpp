#include "MainComponent.h"

MainComponent::MainComponent(juce::AudioProcessor& p) : AudioProcessorEditor(&p), processor(p)
{
    setSize(800, 400);

    saveButton.setButtonText("Save State");
    saveButton.addListener(this);
    addAndMakeVisible(saveButton);

    loadButton.setButtonText("Load State");
    loadButton.addListener(this);
    addAndMakeVisible(loadButton);

    stopButton.setButtonText("Stop");
    stopButton.addListener(this);
    addAndMakeVisible(stopButton);

    initializeFretboard();
}

MainComponent::~MainComponent() {}

void MainComponent::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colours::black);
}

void MainComponent::resized()
{
    auto area = getLocalBounds().reduced(10);
    auto buttonArea = area.removeFromBottom(30);

    saveButton.setBounds(buttonArea.removeFromLeft(buttonArea.getWidth() / 3));
    loadButton.setBounds(buttonArea.removeFromLeft(buttonArea.getWidth() / 2));
    stopButton.setBounds(buttonArea);

    int buttonSize = 20;
    int margin = 10;
    int y = margin;

    for (int string = 0; string < 6; ++string)
    {
        int x = margin;
        for (int fret = 0; fret < 24; ++fret)
        {
            auto* button = fretButtons.add(new juce::ToggleButton());
            button->setBounds(x, y, buttonSize, buttonSize);
            button->setClickingTogglesState(true);
            button->setToggleState(false, juce::NotificationType::dontSendNotification);
            button->setRadioGroupId(string + 1);  // Ensure only one button per string can be selected
            button->addListener(this);
            addAndMakeVisible(button);
            x += buttonSize + margin;
        }
        y += buttonSize + margin;
    }
}

void MainComponent::initializeFretboard()
{
    // Initialize the fretboard with 6 strings and 24 frets
}

void MainComponent::buttonClicked(juce::Button* button)
{
    if (button == &saveButton)
    {
        // Save the state
        std::ofstream outFile("state.txt");
        for (auto* fretButton : fretButtons)
        {
            outFile << fretButton->getToggleState() << " ";
        }
        outFile.close();
    }
    else if (button == &loadButton)
    {
        // Load the state
        std::ifstream inFile("state.txt");
        bool state;
        int i = 0;
        while (inFile >> state)
        {
            if (i < fretButtons.size())
            {
                fretButtons[i]->setToggleState(state, juce::NotificationType::dontSendNotification);
                i++;
            }
        }
        inFile.close();
    }
    else if (button == &stopButton)
    {
        // Stop any currently playing notes
        if (processor.isSuspended())
        {
            processor.setSuspended(false);
        }
        else
        {
            processor.setSuspended(true);
        }
    }
    else
    {
        // Play the corresponding note
        for (int string = 0; string < 6; ++string)
        {
            for (int fret = 0; fret < 24; ++fret)
            {
                int index = string * 24 + fret;
                if (fretButtons[index] == button)
                {
                    playSoundFrequency(calculateFrequency(string, fret));
                }
            }
        }
    }
}

void MainComponent::playSoundFrequency(double frequency)
{
    // Implement sound playback
}

double MainComponent::calculateFrequency(int string, int fret)
{
    const double OPEN_STRING_FREQUENCIES[6] = {82.41, 110.00, 146.83, 196.00, 246.94, 329.63};
    return OPEN_STRING_FREQUENCIES[string] * std::pow(2.0, fret / 12.0);
}
