"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  PROVINCES,
  getCities,
  getDistricts,
  getPostalCodes,
} from "@/data/indonesiaRegions";
import { Search, ChevronDown, Check, X } from "lucide-react";

interface RegionCascadingPickerProps {
  value: string;
  onChange: (formattedValue: string) => void;
  onIntermediateSelect?: (data: {
    province?: string;
    city?: string;
    district?: string;
    postalCode?: string;
  }) => void;
}

type TabType = "provinsi" | "kota" | "kecamatan" | "kodePos";

export default function RegionCascadingPicker({
  value,
  onChange,
  onIntermediateSelect,
}: RegionCascadingPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("provinsi");

  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedPostalCode, setSelectedPostalCode] = useState<string>("");

  const [searchFilter, setSearchFilter] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // When value changes from parent, reset if empty or sync if provided
  useEffect(() => {
    if (!value) {
      setSelectedProvince("");
      setSelectedCity("");
      setSelectedDistrict("");
      setSelectedPostalCode("");
      setActiveTab("provinsi");
      setSearchFilter("");
    } else {
      const parts=value.split(',').map(part=>part.trim());
      const normalize=(text:string)=>text.toLowerCase().replace(/\b(kabupaten|kab\.?|kota|kecamatan|kec\.?)\s*/g,'').replace(/[^a-z0-9]/g,'');
      const province=PROVINCES.find(option=>parts.some(part=>normalize(part)===normalize(option)))||'';
      const city=province?getCities(province).find(option=>parts.some(part=>normalize(part)===normalize(option)))||'':'';
      const district=city?getDistricts(city).find(option=>parts.some(part=>normalize(part)===normalize(option)))||'':'';
      setSelectedProvince(province);setSelectedCity(city);setSelectedDistrict(district);
      setSelectedPostalCode(parts.find(part=>/^\d{5}$/.test(part))||'');
    }
  }, [value]);

  // Step 1: Select Province
  const handleSelectProvince = (prov: string) => {
    setSelectedProvince(prov);
    setSelectedCity("");
    setSelectedDistrict("");
    setSelectedPostalCode("");
    setSearchFilter("");
    setActiveTab("kota");
  };

  // Step 2: Select City
  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    setSelectedDistrict("");
    setSelectedPostalCode("");
    setSearchFilter("");
    setActiveTab("kecamatan");
    onIntermediateSelect?.({ province: selectedProvince, city });
  };

  // Step 3: Select Subdistrict
  const handleSelectDistrict = (dist: string) => {
    setSelectedDistrict(dist);
    setSelectedPostalCode("");
    setSearchFilter("");
    setActiveTab("kodePos");
    onIntermediateSelect?.({ province: selectedProvince, city: selectedCity, district: dist });
  };

  // Step 4: Select Postal Code & Complete Selection
  const handleSelectPostalCode = (code: string) => {
    setSelectedPostalCode(code);
    const formatted = `${selectedDistrict}, ${selectedCity}, ${selectedProvince}, ID, ${code}`;
    onChange(formatted);
    onIntermediateSelect?.({
      province: selectedProvince,
      city: selectedCity,
      district: selectedDistrict,
      postalCode: code,
    });
    setSearchFilter("");
    setIsOpen(false);
  };

  // Get options for current tab
  const getTabOptions = (): string[] => {
    let list: string[] = [];
    if (activeTab === "provinsi") {
      list = PROVINCES;
    } else if (activeTab === "kota") {
      list = selectedProvince ? getCities(selectedProvince) : getCities("JAWA TIMUR");
    } else if (activeTab === "kecamatan") {
      list = selectedCity ? getDistricts(selectedCity) : getDistricts("KAB. JEMBER");
    } else if (activeTab === "kodePos") {
      list = selectedDistrict
        ? getPostalCodes(selectedDistrict)
        : getPostalCodes("SUMBERSARI");
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      return list.filter((item) => item.toLowerCase().includes(q));
    }
    return list;
  };

  const currentOptions = getTabOptions();

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Input Box (Matches Screenshot) */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          if (!selectedProvince) setActiveTab("provinsi");
        }}
        className="w-full bg-white border border-gray-300 hover:border-gray-400 rounded-lg px-3.5 py-2.5 text-xs text-gray-900 cursor-pointer flex items-center justify-between transition-all select-none focus-within:border-[#03AC0E] focus-within:ring-1 focus-within:ring-[#03AC0E]"
      >
        <span className={value ? "text-gray-900 font-medium truncate" : "text-gray-400 truncate"}>
          {value || "Provinsi, Kota, Kecamatan, Kode Pos"}
        </span>

        <div className="flex items-center gap-1.5 text-gray-400 shrink-0 ml-2">
          <Search className="w-3.5 h-3.5" />
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-gray-700" : ""
            }`}
          />
        </div>
      </div>

      {/* Popover Dropdown (Matches Screenshot Exactly) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* 4 Tabs Header (Provinsi | Kota | Kecamatan | Kode Pos) */}
          <div className="flex border-b border-gray-200 bg-white text-xs select-none">
            <button
              type="button"
              onClick={() => {
                setActiveTab("provinsi");
                setSearchFilter("");
              }}
              className={`flex-1 py-3 text-center font-bold transition-colors cursor-pointer border-b-2 relative ${
                activeTab === "provinsi"
                  ? "border-[#EE4D2D] text-[#EE4D2D]"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <span>Provinsi</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedProvince) {
                  setActiveTab("kota");
                  setSearchFilter("");
                }
              }}
              disabled={!selectedProvince}
              className={`flex-1 py-3 text-center font-bold transition-colors border-b-2 ${
                !selectedProvince
                  ? "text-gray-300 border-transparent cursor-not-allowed"
                  : activeTab === "kota"
                  ? "border-[#EE4D2D] text-[#EE4D2D] cursor-pointer"
                  : "border-transparent text-gray-600 hover:text-gray-900 cursor-pointer"
              }`}
            >
              <span>Kota</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedCity) {
                  setActiveTab("kecamatan");
                  setSearchFilter("");
                }
              }}
              disabled={!selectedCity}
              className={`flex-1 py-3 text-center font-bold transition-colors border-b-2 ${
                !selectedCity
                  ? "text-gray-300 border-transparent cursor-not-allowed"
                  : activeTab === "kecamatan"
                  ? "border-[#EE4D2D] text-[#EE4D2D] cursor-pointer"
                  : "border-transparent text-gray-600 hover:text-gray-900 cursor-pointer"
              }`}
            >
              <span>Kecamatan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedDistrict) {
                  setActiveTab("kodePos");
                  setSearchFilter("");
                }
              }}
              disabled={!selectedDistrict}
              className={`flex-1 py-3 text-center font-bold transition-colors border-b-2 ${
                !selectedDistrict
                  ? "text-gray-300 border-transparent cursor-not-allowed"
                  : activeTab === "kodePos"
                  ? "border-[#EE4D2D] text-[#EE4D2D] cursor-pointer"
                  : "border-transparent text-gray-600 hover:text-gray-900 cursor-pointer"
              }`}
            >
              <span>Kode Pos</span>
            </button>
          </div>

          {/* Quick Search filter bar */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={`Cari ${activeTab}...`}
                className="w-full bg-white border border-gray-200 rounded-md pl-8 pr-7 py-1 text-xs placeholder-gray-400 focus:outline-none focus:border-[#03AC0E]"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Items List (Matches user screenshot: uppercase bold font, clean spacing) */}
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 text-xs py-1">
            {currentOptions.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                Tidak ada data ditemukan
              </div>
            ) : (
              currentOptions.map((item, idx) => {
                const isSelected =
                  (activeTab === "provinsi" && item === selectedProvince) ||
                  (activeTab === "kota" && item === selectedCity) ||
                  (activeTab === "kecamatan" && item === selectedDistrict) ||
                  (activeTab === "kodePos" && item === selectedPostalCode);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (activeTab === "provinsi") handleSelectProvince(item);
                      else if (activeTab === "kota") handleSelectCity(item);
                      else if (activeTab === "kecamatan") handleSelectDistrict(item);
                      else if (activeTab === "kodePos") handleSelectPostalCode(item);
                    }}
                    className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-rose-50 text-[#EE4D2D] font-bold"
                        : "text-gray-800 hover:bg-gray-50 hover:text-gray-900 font-medium"
                    }`}
                  >
                    <span>{item}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#EE4D2D]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

