import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

const SNZ_LOGO = import.meta.env.VITE_SNZ_LOGO_URL || '/api/placeholder/200/80'

function DivisionBadges({ team }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Open</span>
      {team.is_junior && (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Juniors</span>
      )}
      {team.is_women && (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-800">Women</span>
      )}
    </div>
  )
}

function ShirtIcon({ size }) {
  if (!size) return null
  return (
    <div className="flex flex-col items-center" title={`Shirt: ${size}`}>
      <svg viewBox="0 0 100 90" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* T-shirt outline */}
        <path
          d="M30 5 L15 20 L2 15 L10 40 L20 38 L20 85 L80 85 L80 38 L90 40 L98 15 L85 20 L70 5 Q60 14 50 14 Q40 14 30 5 Z"
          fill="white"
          stroke="#9ca3af"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <text
          x="50"
          y="62"
          textAnchor="middle"
          fontSize={size.length > 2 ? "20" : "24"}
          fontWeight="bold"
          fill="#374151"
          fontFamily="Arial, sans-serif"
        >{size}</text>
      </svg>
    </div>
  )
}

function ShirtBadge({ size, label }) {
  if (!size) return null
  return (
    <div className="flex flex-col items-center gap-0">
      <ShirtIcon size={size} />
      <span className="text-xs text-gray-500 leading-none -mt-0.5">{label}</span>
    </div>
  )
}

function TeamCard({ team, variant }) {
  const names = [team.competitor1_name, team.competitor2_name, team.competitor3_name]
    .filter(Boolean)

  const partnerNote = team.notes?.match(/Specified partner: (.+) \(not registered\)/)
  const specifiedPartner = partnerNote ? partnerNote[1] : null

  const bgColor = {
    arrived: 'bg-green-50 border-green-200',
    waiting: 'bg-amber-50 border-amber-200',
    incomplete: 'bg-red-50 border-red-200',
  }[variant]

  const numberColor = {
    arrived: 'text-green-700',
    waiting: 'text-amber-700',
    incomplete: 'text-red-700',
  }[variant]

  return (
    <div className={`rounded-lg border-2 px-2.5 py-2 ${bgColor}`}>
      <span className={`text-sm font-black ${numberColor}`}>#{team.team_number}</span>
      <div className="mt-0.5">
        {names.map((name, i) => (
          <p key={i} className="text-xs font-semibold text-gray-800 leading-snug">{name}</p>
        ))}
        {variant === 'incomplete' && (
          <p className="text-xs text-red-500 italic leading-snug mt-0.5">
            {specifiedPartner ? `→ ${specifiedPartner}` : 'No partner specified'}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1 mt-1.5">
        <DivisionBadges team={team} />
      </div>
      {(team.competitor1_shirt || team.competitor2_shirt) && (
        <div className="flex items-center gap-2 mt-1">
          {team.competitor1_shirt && <ShirtBadge size={team.competitor1_shirt} label="C1" />}
          {team.competitor2_shirt && <ShirtBadge size={team.competitor2_shirt} label="C2" />}
        </div>
      )}
    </div>
  )
}

const TEAMS_PER_PAGE = 20
const PAGE_INTERVAL = 8000 // 8 seconds per page

export default function CheckInDisplay() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [arrivingPage, setArrivingPage] = useState(0)
  const [checkedInPage, setCheckedInPage] = useState(0)
  const arrivingPageRef = useRef(0)
  const checkedInPageRef = useRef(0)

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('team_number', { ascending: true })

      if (error) throw error
      setTeams(data || [])
      setLastUpdated(new Date())
      setLoading(false)
    } catch (error) {
      console.error('Error fetching teams:', error)
      setLoading(false)
    }
  }

  // Data refresh — independent of pagination
  useEffect(() => {
    fetchTeams()
    const interval = setInterval(fetchTeams, 5000)
    return () => clearInterval(interval)
  }, [])

  const incomplete = teams.filter(
    t => !t.competitor2_name || t.competitor2_name.trim() === ''
  )

  const notYetArrived = teams.filter(
    t => !t.registered && t.competitor2_name && t.competitor2_name.trim() !== ''
  ).sort((a, b) => a.team_number - b.team_number)

  const checkedIn = teams
    .filter(t => t.registered)
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))

  const totalCheckedIn = checkedIn.length

  const arrivingTotalPages = Math.max(1, Math.ceil(notYetArrived.length / TEAMS_PER_PAGE))
  const checkedInTotalPages = Math.max(1, Math.ceil(checkedIn.length / TEAMS_PER_PAGE))

  const arrivingPageTeams = notYetArrived.slice(
    arrivingPage * TEAMS_PER_PAGE,
    (arrivingPage + 1) * TEAMS_PER_PAGE
  )
  const checkedInPageTeams = checkedIn.slice(
    checkedInPage * TEAMS_PER_PAGE,
    (checkedInPage + 1) * TEAMS_PER_PAGE
  )

  // Auto-advance arriving page — independent timer
  useEffect(() => {
    if (arrivingTotalPages <= 1) return
    const timer = setInterval(() => {
      arrivingPageRef.current = (arrivingPageRef.current + 1) % arrivingTotalPages
      setArrivingPage(arrivingPageRef.current)
    }, PAGE_INTERVAL)
    return () => clearInterval(timer)
  }, [arrivingTotalPages])

  // Auto-advance checked-in page — independent timer
  useEffect(() => {
    if (checkedInTotalPages <= 1) return
    const timer = setInterval(() => {
      checkedInPageRef.current = (checkedInPageRef.current + 1) % checkedInTotalPages
      setCheckedInPage(checkedInPageRef.current)
    }, PAGE_INTERVAL)
    return () => clearInterval(timer)
  }, [checkedInTotalPages])

  // Clamp pages if list shrinks
  useEffect(() => {
    if (arrivingPage >= arrivingTotalPages) {
      setArrivingPage(0)
      arrivingPageRef.current = 0
    }
  }, [arrivingTotalPages])

  useEffect(() => {
    if (checkedInPage >= checkedInTotalPages) {
      setCheckedInPage(0)
      checkedInPageRef.current = 0
    }
  }, [checkedInTotalPages])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold">Loading registration data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-xl p-5 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={SNZ_LOGO} alt="Spearfishing NZ" className="h-14 w-auto object-contain" />
              <div>
                <h1 className="text-3xl font-black text-blue-900">Rosemergy Catfish Cull 2026</h1>
                <p className="text-gray-500 font-medium">Registration Check-In</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-400">
              <div>Auto-updates every 5 seconds</div>
              <div>Last updated: {lastUpdated.toLocaleTimeString()}</div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <Users className="w-6 h-6 mx-auto mb-1 text-blue-600" />
              <div className="text-3xl font-black text-blue-700">{teams.length}</div>
              <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total Teams</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-600" />
              <div className="text-3xl font-black text-green-700">{totalCheckedIn}</div>
              <div className="text-xs text-green-600 font-semibold uppercase tracking-wide">Checked In</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <Clock className="w-6 h-6 mx-auto mb-1 text-amber-600" />
              <div className="text-3xl font-black text-amber-700">{notYetArrived.length}</div>
              <div className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Still to Arrive</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-red-500" />
              <div className="text-3xl font-black text-red-600">{incomplete.length}</div>
              <div className="text-xs text-red-500 font-semibold uppercase tracking-wide">Incomplete</div>
            </div>
          </div>
        </div>

        {/* SECTION 1: Needs Attention */}
        {(notYetArrived.length > 0 || incomplete.length > 0) && (
          <div className="bg-white rounded-xl shadow-xl p-5 mb-5">
            <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-500" />
              Needs Attention
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Not Yet Arrived */}
              {notYetArrived.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <h3 className="font-bold text-amber-700 uppercase tracking-wide text-sm">
                        Still to Arrive ({notYetArrived.length})
                      </h3>
                    </div>
                    {arrivingTotalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => { const p = (arrivingPage - 1 + arrivingTotalPages) % arrivingTotalPages; setArrivingPage(p); arrivingPageRef.current = p; }}
                          className="w-6 h-6 rounded bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold flex items-center justify-center">‹</button>
                        <span className="text-xs text-amber-600 font-semibold whitespace-nowrap">
                          {arrivingPage + 1} / {arrivingTotalPages}
                        </span>
                        <button onClick={() => { const p = (arrivingPage + 1) % arrivingTotalPages; setArrivingPage(p); arrivingPageRef.current = p; }}
                          className="w-6 h-6 rounded bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold flex items-center justify-center">›</button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                    {arrivingPageTeams.map(team => (
                      <TeamCard key={team.id} team={team} variant="waiting" />
                    ))}
                  </div>
                  {arrivingTotalPages > 1 && (
                    <div className="flex justify-center gap-1.5 mt-3">
                      {Array.from({ length: arrivingTotalPages }).map((_, i) => (
                        <button key={i} onClick={() => { setArrivingPage(i); arrivingPageRef.current = i; }}
                          className={`w-2 h-2 rounded-full transition-all ${i === arrivingPage ? 'bg-amber-500 w-4' : 'bg-amber-200'}`} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Incomplete */}
              {incomplete.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <h3 className="font-bold text-red-600 uppercase tracking-wide text-sm">
                      Incomplete Teams ({incomplete.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-[600px] overflow-y-auto pr-1">
                    {incomplete.map(team => (
                      <TeamCard key={team.id} team={team} variant="incomplete" />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* SECTION 2: Checked In */}
        <div className="bg-white rounded-xl shadow-xl p-5 mb-4">
          <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            Checked In
            <span className="text-base font-normal text-gray-400 ml-1">
              {totalCheckedIn > 0 ? `(${totalCheckedIn})` : ''}
            </span>
          </h2>

          {checkedIn.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No teams checked in yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
                {checkedInPageTeams.map(team => (
                  <TeamCard key={team.id} team={team} variant="arrived" />
                ))}
              </div>
              {checkedInTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button onClick={() => { const p = (checkedInPage - 1 + checkedInTotalPages) % checkedInTotalPages; setCheckedInPage(p); checkedInPageRef.current = p; }}
                    className="w-7 h-7 rounded bg-green-100 hover:bg-green-200 text-green-700 text-sm font-bold flex items-center justify-center">‹</button>
                  <div className="flex gap-1.5">
                    {Array.from({ length: checkedInTotalPages }).map((_, i) => (
                      <button key={i} onClick={() => { setCheckedInPage(i); checkedInPageRef.current = i; }}
                        className={`w-2 h-2 rounded-full transition-all ${i === checkedInPage ? 'bg-green-500 w-4' : 'bg-green-200'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-green-600 font-semibold">{checkedInPage + 1} / {checkedInTotalPages}</span>
                  <button onClick={() => { const p = (checkedInPage + 1) % checkedInTotalPages; setCheckedInPage(p); checkedInPageRef.current = p; }}
                    className="w-7 h-7 rounded bg-green-100 hover:bg-green-200 text-green-700 text-sm font-bold flex items-center justify-center">›</button>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-white text-sm pb-4 opacity-60">
          catfish-cull.netlify.app/checkin
        </p>

      </div>
    </div>
  )
}
