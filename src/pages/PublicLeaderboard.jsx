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
  const [latestEntry, setLatestEntry] = useState(null)

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

      // Get latest entry (with or without photo)
      const { data: latestData, error: latestError } = await supabase
        .from('catches')
        .select(`
          id,
          catfish_count,
          photo_urls,
          created_at,
          team_id,
          teams (
            team_number,
            competitor1_name,
            competitor2_name,
            competitor3_name,
            division
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!latestError && latestData) {
        // Check if team is eligible (2 people only)
        const isEligible = !latestData.teams.competitor3_name || latestData.teams.competitor3_name.trim() === ''
        
        // Find this team's overall ranking (only if eligible)
        const overallRank = isEligible ? data?.findIndex(c => c.team_id === latestData.team_id) + 1 : null
        
        // Find this team's division ranking (only if eligible)
        const divisionTeams = data?.filter(c => c.division === latestData.teams.division) || []
        const divisionRank = isEligible ? divisionTeams.findIndex(c => c.team_id === latestData.team_id) + 1 : null
        
        setLatestEntry({
          ...latestData,
          eligible: isEligible,
          overallRank: overallRank || '-',
          divisionRank: divisionRank || '-'
        })
      } else {
        setLatestEntry(null)
      }

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

    // Auto-refresh every 10 seconds (no real-time subscriptions for better scalability)
    const interval = setInterval(() => {
      fetchLeaderboard()
      fetchEventState()
    }, 10000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  // Filter by category
  const filteredCatches = selectedDivision === 'All'
    ? catches // All = Open category (everyone)
    : selectedDivision === 'Juniors'
    ? catches.filter(c => c.is_junior)
    : selectedDivision === 'Women'
    ? catches.filter(c => c.is_women)
    : catches

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
              <img src={SNZ_LOGO} alt="Spearfishing New Zealand" className="h-32 object-contain" />
              <div>
                <h1 className="text-4xl font-bold text-blue-900">🏆 Catfish Cull 2026</h1>
                <p className="text-xl text-gray-600">Live Results</p>
              </div>
            </div>
            
            {/* Sponsor - Top Right */}
            <div className="text-center">
              <p className="text-base text-gray-500 uppercase tracking-wide mb-3 font-semibold">Proudly Sponsored By</p>
              <img 
                src={SPONSOR_LOGO} 
                alt="Hunting & Fishing Taupo" 
                className="h-32 object-contain"
              />
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
            {['All', 'Women', 'Juniors'].map(div => (
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

        {/* Footer - Latest Entry */}
        <div className="text-center mt-6">
          {latestEntry && (
            <div className="bg-white rounded-lg shadow-2xl p-6 mb-4">
              <h3 className="text-sm text-gray-500 uppercase tracking-wide mb-4">🔥 Latest Entry</h3>
              <div className="flex items-center justify-center gap-6 max-w-2xl mx-auto">
                {/* Photo or Placeholder */}
                <div className="flex-shrink-0">
                  {latestEntry.photo_urls && latestEntry.photo_urls.length > 0 ? (
                    <img 
                      src={latestEntry.photo_urls[0]} 
                      alt="Latest catch" 
                      className="w-32 h-32 object-cover rounded-lg border-4 border-green-400 shadow-xl"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg border-4 border-gray-300 shadow-xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-1">🎣</div>
                        <p className="text-xs text-gray-600">No photo</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 text-left">
                  <div className="mb-3">
                    <p className="text-3xl font-bold text-gray-900">
                      Team #{latestEntry.teams.team_number}
                    </p>
                    <p className="text-lg text-gray-600">
                      {latestEntry.teams.competitor1_name} & {latestEntry.teams.competitor2_name}
                      {latestEntry.teams.competitor3_name && ` & ${latestEntry.teams.competitor3_name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 px-4 py-2 rounded-lg">
                      <p className="text-4xl font-bold text-green-600">{latestEntry.catfish_count}</p>
                      <p className="text-sm text-green-700">Catfish</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                          Open
                        </span>
                        {latestEntry.teams.is_junior && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                            Juniors
                          </span>
                        )}
                        {latestEntry.teams.is_women && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-pink-100 text-pink-800">
                            Women
                          </span>
                        )}
                      </div>
                      {latestEntry.eligible ? (
                        <div className="flex gap-2 flex-wrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                            #{latestEntry.overallRank} Overall
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-700">
                            ⚠️ Ineligible for Prizes
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="text-white">
            <p className="text-sm">Auto-refreshes every 10 seconds • Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
