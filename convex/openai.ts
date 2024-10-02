import { action } from "./_generated/server";
import { v } from "convex/values";

import OpenAI from "openai";
import { SpeechCreateParams } from "openai/resources/audio/speech.mjs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// export const generateAudioAction = action({
//   args: { input: v.string(), voice: v.string() },
//   handler: async (_, { voice, input }) => {
//     const mp3 = await openai.audio.speech.create({
//       model: "tts-1",
//       voice: voice as SpeechCreateParams['voice'],
//       input,
//     });

//     const buffer = await mp3.arrayBuffer();
    
//     return buffer;
//   },
// });

export const generatePodcastScript = action({
  args: { input: v.string() },
  handler: async (_, { input }) => {
    const introText = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: `${input} Write an introduction for a podcast. Keep it short and engaging.`,
      max_tokens: 500, // Generate longer text for the intro
    });

    const mainText = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: `${input} Main discussion content for the podcast. Keep it short, informative and engaging.`,
      max_tokens: 1500, // Generate the bulk of the content
    });

    const conclusionText = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: `${input} Write a conclusion for a podcast. Keep it short and engaging.`,
      max_tokens: 500,
    });

    return {
      intro: introText.choices[0].text,
      main: mainText.choices[0].text,
      conclusion: conclusionText.choices[0].text,
    };
  },
});

const MAX_SIZE = 5 * 1024 * 1024; // 7.5MB to leave some buffer

export const generateAudioAction = action({
  args: { input: v.string(), voice: v.string() },
  handler: async (ctx, { voice, input }) => {
    // Generate the podcast script (intro, main content, conclusion)
    const script = await generatePodcastScript(ctx, { input });

    // Combine all sections into a single text
    const fullScript = `${script.intro}\n\n${script.main}\n\n${script.conclusion}`;

    // Split the script into chunks under 4096 characters
    const textChunks = splitTextIntoChunks(fullScript, 4096);

    let totalSize = 0;
    const audioChunks = [];

    for (const chunk of textChunks) {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice as SpeechCreateParams['voice'],
        input: chunk,
      });
      
      const buffer = await mp3.arrayBuffer();
      
      if (totalSize + buffer.byteLength > MAX_SIZE) {
        // If adding this chunk would exceed the limit, stop processing
        break;
      }

      audioChunks.push(buffer);
      totalSize += buffer.byteLength;
    }

    // Concatenate the audio buffers
    const finalPodcast = concatenateAudioBuffers(audioChunks);

    return finalPodcast;
  },
});

// Helper function to split text into chunks of a specific length
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLength;
    // Ensure you don't break in the middle of a sentence
    if (end < text.length && text[end] !== ' ') {
      end = text.lastIndexOf(' ', end);
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

// Helper function to concatenate audio buffers
function concatenateAudioBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  let totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  let result = new Uint8Array(totalLength);
  
  let offset = 0;
  buffers.forEach(buffer => {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  });

  return result.buffer;
}



export const generateThumbnailAction = action({
  args: { prompt: v.string() },
  handler: async (_, { prompt }) => {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    })

    const url = response.data[0].url;

    if(!url) {
      throw new Error('Error generating thumbnail');
    }

    const imageResponse = await fetch(url);
    const buffer = await imageResponse.arrayBuffer();
    return buffer;
  }
})