import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Trophy, Clock, TrendingUp } from 'lucide-react'

// Logo URLs from environment variables or placeholders
const SNZ_LOGO = import.meta.env.VITE_SNZ_LOGO_URL || '/api/placeholder/200/80'
const SPONSOR_LOGO = import.meta.env.VITE_SPONSOR_LOGO_URL || '/api/placeholder/300/120'

export default function PublicLeaderboard() {
  const [catches, setCatches] = useState([])
  const [selectedDivision, setSelectedDivision] = useState('All')
  const [eventState, setEventState] = useState(null)
  const [heaviestFish, setHeaviestFish] = useState(null)
  const [lightestFish, setLightestFish] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('catfish_count', { ascending: false })

      if (error) throw error
      setCatches(data || [])
      
      // Get prize fish
      const eligible = data?.filter(c => c.eligible && c.status !== 'disqualified') || []
      
      const heaviest = eligible
        .filter(c => c.heaviest_fish_grams)
        .sort((a, b) => b.heaviest_fish_grams - a.heaviest_fish_grams)[0]
      
      const lightest = eligible
        .filter(c => c.lightest_fish_grams)
        .sort((a, b) => a.lightest_fish_grams - b.lightest_fish_grams)[0]
      
      setHeaviestFish(heaviest || null)
      setLightestFish(lightest || null)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      setLoading(false)
    }
  }

  // Fetch event state
  const fetchEventState = async () => {
    const { data } = await supabase
      .from('event_state')
      .select('*')
      .single()
    
    setEventState(data)
  }

  useEffect(() => {
    fetchLeaderboard()
    fetchEventState()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('leaderboard-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'catches' },
        () => fetchLeaderboard()
      )
      .subscribe()

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchLeaderboard, 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  // Filter by division
  const filteredCatches = selectedDivision === 'All'
    ? catches
    : catches.filter(c => c.division === selectedDivision)

  // Calculate rankings
  const rankedCatches = filteredCatches.map((c, index, arr) => {
    if (!c.eligible || c.status === 'disqualified') {
      return { ...c, rank: '-' }
    }
    
    // Find rank among eligible teams
    const eligibleAbove = arr
      .slice(0, index)
      .filter(x => x.eligible && x.status !== 'disqualified' && x.catfish_count > c.catfish_count)
    
    return { ...c, rank: eligibleAbove.length + 1 }
  })

  // Stats
  const totalTeams = catches.length
  const totalCatfish = catches.reduce((sum, c) => sum + c.catfish_count, 0)
  const avgCatfish = totalTeams > 0 ? (totalCatfish / totalTeams).toFixed(1) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
        <div className="text-white text-2xl">Loading leaderboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <img src={SNZ_LOGO} alt="Spearfishing New Zealand" className="h-16 object-contain" />
              <div>
                <h1 className="text-4xl font-bold text-blue-900">🏆 Catfish Cull 2026</h1>
                <p className="text-xl text-gray-600">Live Results</p>
              </div>
            </div>
          </div>

          {/* Provisional Warning */}
          {eventState?.status === 'provisional' && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Clock className="w-5 h-5" />
                <div>
                  <p className="font-semibold">⚠️ PROVISIONAL RESULTS</p>
                  <p className="text-sm">
                    Protest period open until {eventState.protest_deadline}. 
                    Final results at prizegiving: {eventState.prizegiving_time}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Division Tabs */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {['All', 'Open', 'Women', 'Juniors'].map(div => (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                className={`px-6 py-3 rounded-lg font-semibold transition ${
                  selectedDivision === div
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {div}
              </button>
            ))}
          </div>
        </div>

        {/* Prize Fish Leaders */}
        {(heaviestFish || lightestFish) && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {heaviestFish && (
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-6 h-6" />
                  <h3 className="text-xl font-bold">Heaviest Fish</h3>
                </div>
                <p className="text-3xl font-bold">{heaviestFish.heaviest_fish_grams}g</p>
                <p className="text-lg">Team #{heaviestFish.team_number} - {heaviestFish.team_names}</p>
              </div>
            )}

            {lightestFish && (
              <div className="bg-gradient-to-br from-green-400 to-teal-500 rounded-lg shadow-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-6 h-6" />
                  <h3 className="text-xl font-bold">Lightest Fish</h3>
                </div>
                <p className="text-3xl font-bold">{lightestFish.lightest_fish_grams}g</p>
                <p className="text-lg">Team #{lightestFish.team_number} - {lightestFish.team_names}</p>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <TrendingUp className="w-5 h-5" />
              <h3 className="font-semibold">Total Teams</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalTeams}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <TrendingUp className="w-5 h-5" />
              <h3 className="font-semibold">Total Catfish</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalCatfish}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <TrendingUp className="w-5 h-5" />
              <h3 className="font-semibold">Average</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{avgCatfish}</p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">Team #</th>
                  <th className="px-4 py-3 text-left">Team</th>
                  <th className="px-4 py-3 text-left">Division</th>
                  <th className="px-4 py-3 text-center">Catfish</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rankedCatches.map((c, index) => (
                  <tr
                    key={c.id}
                    className={`border-b ${
                      !c.eligible || c.status === 'disqualified'
                        ? 'bg-gray-100 text-gray-500'
                        : index % 2 === 0
                        ? 'bg-white'
                        : 'bg-blue-50'
                    }`}
                  >
                    <td className="px-4 py-3 font-bold">{c.rank}</td>
                    <td className="px-4 py-3">#{c.team_number}</td>
                    <td className="px-4 py-3">{c.team_names}</td>
                    <td className="px-4 py-3">{c.division}</td>
                    <td className="px-4 py-3 text-center text-xl font-bold">{c.catfish_count}</td>
                    <td className="px-4 py-3">
                      {c.status === 'under_protest' && (
                        <span className="text-orange-600 font-semibold">Under Protest</span>
                      )}
                      {c.status === 'disqualified' && (
                        <span className="text-red-600 font-semibold">Disqualified</span>
                      )}
                      {!c.eligible && c.status === 'provisional' && (
                        <span className="text-gray-500 text-sm">Ineligible (3-person)</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rankedCatches.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No scores yet. First team to weigh in will appear here!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          {/* Sponsor Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <p className="text-gray-600 text-sm mb-3 uppercase tracking-wide">Proudly Sponsored By</p>
            <div className="flex justify-center">
              <img 
                src={SPONSOR_LOGO} 
                alt="Hunting & Fishing Taupo" 
                className="h-20 object-contain"
              />
            </div>
          </div>
          
          <div className="text-white">
            <p className="text-sm">Auto-refreshes every 10 seconds • Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
