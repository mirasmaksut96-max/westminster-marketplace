import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Marketplace from './Marketplace'


function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })


    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])


  if (loading) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Loading...</p>


  if (!session) return <Auth />


  return <Marketplace session={session} />
}


export default App




