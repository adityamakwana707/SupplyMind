'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Package2, BarChart3, Activity } from 'lucide-react';
import { 
  StockLineChart, 
  StockAreaChart, 
  StockBarChart, 
  StockDonutChart 
} from './charts/StockCharts';

interface AnalyticsData {
  stockTrends: any[];
  topProducts: any[];
  stockDistribution: any[];
  requisitionTrends: any[];
}

interface AnalyticsDashboardProps {
  warehouseId?: string;
}

export default function AnalyticsDashboard({ warehouseId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchAnalyticsData();
  }, [warehouseId, period]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (warehouseId) params.append('warehouseId', warehouseId);
      
      const response = await fetch(`/api/analytics/dashboard?${params}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transform stock trends data for line chart
  const processStockTrends = (trends: any[]) => {
    const dateMap = new Map();
    
    trends.forEach(trend => {
      const date = trend._id.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, receipts: 0, deliveries: 0, adjustments: 0 });
      }
      
      const dayData = dateMap.get(date);
      switch (trend._id.type) {
        case 'RECEIPT':
          dayData.receipts = trend.totalQuantity;
          break;
        case 'DELIVERY':
          dayData.deliveries = Math.abs(trend.totalQuantity);
          break;
        case 'ADJUSTMENT':
          dayData.adjustments = trend.totalQuantity;
          break;
      }
    });
    
    return Array.from(dateMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  // Transform stock distribution for donut chart
  const processStockDistribution = (distribution: any[]) => {
    return distribution.map(item => ({
      name: item._id,
      value: item.count,
      _id: item._id
    }));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-card/50 backdrop-blur-xl rounded-xl border border-border p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load analytics data. Please try again.
      </div>
    );
  }

  const stockTrendsData = processStockTrends(data.stockTrends);
  const stockDistributionData = processStockDistribution(data.stockDistribution);

  return (
    <div className="space-y-6 mt-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Analytics Overview
        </h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Movement Trends */}
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-border p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Stock Movement Trends</h3>
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            Daily stock movements over the last 7 days
          </div>
          {stockTrendsData.length > 0 ? (
            <StockAreaChart
              data={stockTrendsData}
              xAxisKey="date"
              areas={[
                { key: 'receipts', name: 'Receipts', color: 'hsl(var(--chart-1))' },
                { key: 'deliveries', name: 'Deliveries', color: 'hsl(var(--chart-2))' },
                { key: 'adjustments', name: 'Adjustments', color: 'hsl(var(--chart-3))' }
              ]}
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-70 text-muted-foreground">
              No movement data available
            </div>
          )}
        </div>

        {/* Stock Distribution */}
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-border p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Package2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Stock Level Distribution</h3>
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            Current inventory status across all products
          </div>
          {stockDistributionData.length > 0 ? (
            <StockDonutChart
              data={stockDistributionData}
              nameKey="name"
              valueKey="value"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-70 text-muted-foreground">
              No distribution data available
            </div>
          )}
        </div>

        {/* Top Products by Movement */}
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-border p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Top Products by Movement</h3>
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            Most active products in the selected period
          </div>
          {data.topProducts.length > 0 ? (
            <StockBarChart
              data={data.topProducts.slice(0, 8)}
              xAxisKey="name"
              bars={[
                { key: 'inbound', name: 'Inbound', color: 'hsl(var(--chart-1))' },
                { key: 'outbound', name: 'Outbound', color: 'hsl(var(--chart-2))' }
              ]}
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-70 text-muted-foreground">
              No product movement data available
            </div>
          )}
        </div>

        {/* Recent Activity Summary */}
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-border p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Activity Summary</h3>
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            Key metrics from the selected period
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-foreground">Total Products Moved</span>
              <span className="font-semibold text-foreground">
                {data.topProducts.reduce((sum, p) => sum + p.totalMovement, 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-foreground">Active Products</span>
              <span className="font-semibold text-foreground">{data.topProducts.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-foreground">Stock Categories</span>
              <span className="font-semibold text-foreground">{data.stockDistribution.length}</span>
            </div>
            {data.topProducts.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium text-foreground mb-2">Top Mover</div>
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="font-medium text-foreground">{data.topProducts[0]?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    SKU: {data.topProducts[0]?.sku} • {data.topProducts[0]?.totalMovement.toLocaleString()} units moved
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
