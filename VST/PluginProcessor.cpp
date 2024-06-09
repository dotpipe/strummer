// PluginProcessor.cpp

#include "PluginProcessor.h"
#include "PluginEditor.h"

PluginProcessor::PluginProcessor()
{
    synth.addSound(new juce::SynthesiserSound());
    synth.addVoice(new juce::SynthesiserVoice());
}

PluginProcessor::~PluginProcessor()
{
}

void PluginProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    synth.setCurrentPlaybackSampleRate(sampleRate);
}

void PluginProcessor::releaseResources()
{
}

void PluginProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    buffer.clear();
    synth.renderNextBlock(buffer, midiMessages, 0, buffer.getNumSamples());
}

juce::AudioProcessorEditor* PluginProcessor::createEditor()
{
    return new PluginEditor(*this);
}

bool PluginProcessor::hasEditor() const
{
    return true;
}

const juce::String PluginProcessor::getName() const
{
    return JucePlugin_Name;
}

bool PluginProcessor::acceptsMidi() const
{
    return true;
}

bool PluginProcessor::producesMidi() const
{
    return false;
}

bool PluginProcessor::isMidiEffect() const
{
    return false;
}

double PluginProcessor::getTailLengthSeconds() const
{
    return 0.0;
}

int PluginProcessor::getNumPrograms()
{
    return 1;
}

int PluginProcessor::getCurrentProgram()
{
    return 0;
}

void PluginProcessor::setCurrentProgram(int index)
{
}

const juce::String PluginProcessor::getProgramName(int index)
{
    return {};
}

void PluginProcessor::changeProgramName(int index, const juce::String& newName)
{
}

void PluginProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    juce::MemoryOutputStream stream(destData, true);
    parameters.state.writeToStream(stream);
}

void PluginProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    juce::MemoryInputStream stream(data, static_cast<size_t> (sizeInBytes), false);
    parameters.state = juce::ValueTree::readFromStream(stream);
}
