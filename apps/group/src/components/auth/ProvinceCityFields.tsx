'use client';

import {
  getCitiesForProvince,
  getIranProvinces,
} from '@kia./shared';
import { useMemo } from 'react';

type ProvinceCityFieldsProps = {
  province: string;
  city: string;
  onProvinceChange: (province: string) => void;
  onCityChange: (city: string) => void;
  provinceLabel: string;
  cityLabel: string;
  provincePlaceholder: string;
  cityPlaceholder: string;
  provinceError?: string;
  cityError?: string;
  disabled?: boolean;
};

export function ProvinceCityFields({
  province,
  city,
  onProvinceChange,
  onCityChange,
  provinceLabel,
  cityLabel,
  provincePlaceholder,
  cityPlaceholder,
  provinceError,
  cityError,
  disabled,
}: ProvinceCityFieldsProps) {
  const provinces = useMemo(() => getIranProvinces(), []);
  const cities = useMemo(() => getCitiesForProvince(province), [province]);

  return (
    <>
      <label className="form-field">
        <span>{provinceLabel}</span>
        <select
          value={province}
          disabled={disabled}
          onChange={(e) => {
            onProvinceChange(e.target.value);
            onCityChange('');
          }}
          required
        >
          <option value="">{provincePlaceholder}</option>
          {provinces.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        {provinceError ? <span className="form-error">{provinceError}</span> : null}
      </label>
      <label className="form-field">
        <span>{cityLabel}</span>
        <select
          value={city}
          disabled={disabled || !province}
          onChange={(e) => onCityChange(e.target.value)}
          required
        >
          <option value="">{cityPlaceholder}</option>
          {cities.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        {cityError ? <span className="form-error">{cityError}</span> : null}
      </label>
    </>
  );
}
