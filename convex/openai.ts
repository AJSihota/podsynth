import { action } from "./_generated/server";
import { v } from "convex/values";

import OpenAI from "openai";
import { SpeechCreateParams } from "openai/resources/audio/speech.mjs";
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

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
      prompt: `${input} Write an introduction for a podcast.`,
      max_tokens: 500, // Generate longer text for the intro
    });

    const mainText = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: `${input} Main discussion content for the podcast.`,
      max_tokens: 1500, // Generate the bulk of the content
    });

    const conclusionText = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: `${input} Write a conclusion for a podcast.`,
      max_tokens: 500,
    });

    return {
      intro: introText.choices[0].text,
      main: mainText.choices[0].text,
      conclusion: conclusionText.choices[0].text,
    };
  },
});

export const generateAudioAction = action({
  args: { input: v.string(), voice: v.string() },
  handler: async (ctx, { voice, input }) => {
    // Generate the podcast script (intro, main content, conclusion)
    const script = await generatePodcastScript(ctx, { input });

    // Combine all sections into a single text
    const fullScript = `${script.intro}\n\n${script.main}\n\n${script.conclusion}`;

    // Split the script into chunks under 4096 characters
    const textChunks = splitTextIntoChunks(fullScript, 4096);

    // Generate audio for each chunk and combine buffers
    const audioBuffers = await Promise.all(textChunks.map(async (chunk) => {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice as SpeechCreateParams['voice'],
        input: chunk,
      });
      return await mp3.arrayBuffer();
    }));

    // Concatenate the audio buffers into one podcast
    const fullAudioBuffer = concatenateAudioBuffers(audioBuffers);

    // Compress the audio
    const compressedAudio = await compressAudio(fullAudioBuffer);

    return compressedAudio;
  },
});

// Helper function to compress audio using ffmpeg
async function compressAudio(buffer: ArrayBuffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const inputStream = new Readable();
    inputStream.push(Buffer.from(buffer));
    inputStream.push(null);

    let outputBuffer = Buffer.alloc(0);

    ffmpeg(inputStream)
      .audioCodec('libmp3lame')
      .audioBitrate(64) // Adjust bitrate as needed
      .audioChannels(1) // Mono audio
      .audioFrequency(22050) // Lower sample rate
      .format('mp3')
      .on('error', reject)
      .on('end', (chunk: any) => {
        outputBuffer = Buffer.concat([outputBuffer, chunk]);
      })
      .on('end', () => resolve(outputBuffer));
  });
}

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