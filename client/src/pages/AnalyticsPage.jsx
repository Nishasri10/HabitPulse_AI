import { useEffect, useState } from 'react';
import axios from 'axios';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#8B80C5', '#DDEBDD', '#DCEAF5', '#EAE7F8', '#A7C7E7', '#F6D7A7'];

export default function AnalyticsPage() {
  const [data, setData] = useState({ habits: [], completions: [], habitMix: [], completionTrend: [], chartData: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get('/analytics/summary');
        setData({
          habits: data.habits || [],
          completions: data.completions || [],
          habitMix: data.habitMix || [],
          completionTrend: data.completionTrend || [],
          chartData: data.chartData || [],
        });
      } catch (error) {
        console.error('Failed to load analytics', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const activeHabits = (data.habits || []).filter((habit) => habit.status === 'active' && !habit.archivedAt);
  const habitMixData = data.habitMix?.length ? data.habitMix : activeHabits.reduce((acc, habit) => {
    const key = habit.category || 'Other';
    const current = acc.find((entry) => entry.name === key);
    if (current) {
      current.value += 1;
    } else {
      acc.push({ name: key, value: 1 });
    }
    return acc;
  }, []);

  const trendData = data.completionTrend?.length ? data.completionTrend : [{ name: 'No data', value: 0 }];
  const performanceData = data.chartData?.length ? data.chartData : activeHabits.map((habit) => ({
    name: habit.name,
    value: (data.completions || []).filter((completion) => completion.habitId === habit._id).length,
  }));

  return (
    <div className="page-shell">
      <div className="row g-4">
        <div className="col-xl-8">
          <div className="card panel-card">
            <h5>Completion trend</h5>
            {loading ? (
              <div className="empty-state">Loading analytics...</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData}>
                  <CartesianGrid stroke="#eaeaea" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#8B80C5" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="col-xl-4">
          <div className="card panel-card">
            <h5>Habit mix</h5>
            {loading ? (
              <div className="empty-state">Loading habit mix...</div>
            ) : habitMixData.length === 0 ? (
              <div className="empty-state">Create your first habit to see your Habit Mix.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={habitMixData} dataKey="value" nameKey="name" outerRadius={90} paddingAngle={2}>
                    {habitMixData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} habits`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="card panel-card mt-4">
        <h5>Habit performance</h5>
        {loading ? (
          <div className="empty-state">Loading performance data...</div>
        ) : performanceData.length === 0 ? (
          <div className="empty-state">No habit data available yet. Add a habit to view performance.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={performanceData}>
              <CartesianGrid stroke="#eaeaea" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#8B80C5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
