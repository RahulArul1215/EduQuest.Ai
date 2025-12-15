import React from 'react'
import { useContext } from 'react'
import '../../Styles/HolderComponents/WelcomeAni.css'
import Loader from '../Loader'
import Animation from './Animation'
import { UserContext } from '../Context/UserContext'


export const WelcomeAni = () => {
  const { userData, loading } = useContext(UserContext);

  return (
    <div className='WelcomeAni-Container'>
        <div className='Loader-placer'>
            <Animation/>
        </div>
        <h3>Hello {userData?.user.full_name},</h3>
        <h1>Explore deeper insights & learn smarter every day</h1>
        <h2>Powered by AI</h2>
    </div>
  )
}
