'use client';
import React from 'react'
import Discover from './discover/page'
import PodcastCard from '@/components/ui/PodcastCard'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

const Home = () => {
  const podcastData = useQuery(api.podcasts.getTrendingPodcasts);

  return (
    <div className="mt-9 flex flex-col gap-9">
      <section className='flex flex-col gap-5'>
        {/* <Discover
          searchParams={{ search: '' }}
        /> */}
        <h1 className="text-20 font-bold text-white-1">
          Trending Podcasts
        </h1>
        <div className="podcast_grid">
        {podcastData?.map(({imageUrl, podcastTitle, podcastDescription, _id}) => (
          <PodcastCard key={_id} imgUrl={imageUrl!} 
          title={podcastTitle} description={podcastDescription}
          podcastId={_id }
          />
        ))}
        </div>

        </section>
    </div>
  )
}

export default Home