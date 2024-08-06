import { SignIn } from '@clerk/nextjs'
import React from 'react'

const Page = () => {
  return (
    <div className='flex-center glassmorhism-auth h-screen w-full'>
        <SignIn/>
    </div>
  )
}

export default Page