import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

function App() {
  const [artworks, setArtworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState(0);
  const [limit, setLimit] = useState(12);

  const [selected, setSelected] = useState<any[]>([]);
  const [totalToPick, setTotalToPick] = useState(0);
  const [pickPlan, setPickPlan] = useState<{ [key: number]: number }>({});
  const [autoPick, setAutoPick] = useState(false);

  const panelRef = useRef<any>(null);
  const page = Math.floor(start / limit) + 1;

  // Fetch data from API
  const fetchArtworks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}page=${page}&limit=${limit}`);
      setArtworks(res.data.data);
    } catch (error) {
      console.error("Error fetching artworks:", error);
      setArtworks([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchArtworks();
  }, [fetchArtworks]);

  useEffect(() => {
    if (!artworks.length || loading) return;

    const countThisPage = pickPlan[page];
    if (countThisPage && countThisPage > 0) {
      const items = artworks.slice(0, countThisPage);
      const selectedIds = new Set(selected.map(item => item.id));
      const fresh = items.filter(item => !selectedIds.has(item.id));
      setSelected([...selected, ...fresh]);
    }

    const totalPlanned = Object.values(pickPlan).reduce((sum, val) => sum + val, 0);
    if (selected.length >= totalPlanned && autoPick) {
      setAutoPick(false);
      setPickPlan({});
      setTotalToPick(0);
    }
  }, [artworks, loading]);

  const onQuickPick = (e:any) => {
    const count = parseInt(e.target.value) || 0;
    setTotalToPick(count);

    if (count === 0) {
      setSelected([]);
      setPickPlan({});
      setAutoPick(false);
      return;
    }

    const plan: { [key: number]: number } = {};
    let remain = count;
    let p = page;

    while (remain > 0) {
      const take = Math.min(limit, remain);
      plan[p] = take;
      remain -= take;
      p++;
    }

    setPickPlan(plan);
    setAutoPick(true);

    const currentCount = plan[page];
    if (currentCount && currentCount > 0) {
      const items = artworks.slice(0, currentCount);
      setSelected(items);
    } else {
      setSelected([]);
    }
  };

  const onManualSelect = (e: any) => {
    if (autoPick) {
      setAutoPick(false);
      setPickPlan({});
      setTotalToPick(0);
    }

    const currentIds = new Set(artworks.map(a => a.id));
    const others = selected.filter(a => !currentIds.has(a.id));
    const uniqueMap = new Map();

    [...others, ...e.value].forEach(item => uniqueMap.set(item.id, item));
    setSelected(Array.from(uniqueMap.values()));
  };

  const onPageChange = (e: any) => {
    setLoading(true);
    setStart(e.first);
    setLimit(e.rows);
  };

  const showInscriptions = (row: any) => row.inscriptions || "-";

  const leftToSelect = totalToPick > selected.length ? totalToPick - selected.length : 0;

  const visibleSelected = selected.filter(item => artworks.some(a => a.id === item.id));

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>Loading...</div>
      ) : (
        <DataTable
          value={artworks}
          selection={visibleSelected}
          onSelectionChange={onManualSelect}
          dataKey="id"
          tableStyle={{ minWidth: "70rem", margin: "16px 0" }}
          style={{ padding: "12px", border: "1px solid #ccc", borderRadius: "6px" }}
        >
          <Column
            selectionMode="multiple"
            header={
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Button icon="pi pi-chevron-down" rounded text onClick={(e) => panelRef.current?.toggle(e)} />
                <OverlayPanel ref={panelRef}>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={onQuickPick}
                    value={totalToPick}
                    style={{ width: "60px", padding: "4px", textAlign: "center" }}
                  />
                </OverlayPanel>
                <br />
              </div>
            }
            headerStyle={{ width: "10rem" }}
          />
          <Column field="title" header="Title" />
          <Column field="place_of_origin" header="Origin" />
          <Column field="artist_display" header="Artist" />
          <Column field="inscriptions" header="Inscriptions" body={showInscriptions} />
          <Column field="date_start" header="Start Year" />
          <Column field="date_end" header="End Year" />
        </DataTable>
      )}

      <Paginator
        first={start}
        rows={limit}
        totalRecords={120}
        onPageChange={onPageChange}
        style={{ marginTop: "10px" }}
      />

      <div style={{ marginTop: "14px", textAlign: "center", fontSize: "16px" }}>
        Selected: {selected.length}
        {leftToSelect > 0 && ` (${leftToSelect} pending)`}
      </div>
    </div>
  );
}

export default App;
