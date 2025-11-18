"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import styles from "./style.module.scss";

interface Option<T> {
  value: T;
  label: string;
}

interface SearchableSelectProps<T> {
  options: Option<T>[];
  value: T | T[];
  onChange: (value: T | T[]) => void;
  placeholder?: string;
  isMulti?: boolean;
}

export const SearchableSelect = <T extends string | number>({
  options,
  value,
  onChange,
  placeholder = "Select...",
  isMulti = false,
}: SearchableSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(
    () =>
      options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [options, searchTerm],
  );

  const selectedLabels = useMemo(() => {
    if (isMulti) {
      if (!Array.isArray(value)) return [];
      return value
        .map((v) => options.find((o) => o.value === v)?.label)
        .filter(Boolean);
    } else {
      return options.find((o) => o.value === value)?.label || "";
    }
  }, [value, options, isMulti]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSelect = (option: Option<T>) => {
    if (isMulti) {
      const newValue = Array.isArray(value) ? [...value] : [];
      const index = newValue.indexOf(option.value);
      if (index > -1) {
        newValue.splice(index, 1);
      } else {
        newValue.push(option.value);
      }
      onChange(newValue);
    } else {
      onChange(option.value);
      setIsOpen(false);
    }
    setSearchTerm("");
  };

  const removeValue = (valToRemove: T) => {
    if (isMulti && Array.isArray(value)) {
      onChange(value.filter((v) => v !== valToRemove));
    }
  };

  return (
    <div className={styles.selectWrapper} ref={wrapperRef}>
      <div
        className={`${styles.selectHeader} ${isOpen ? styles.open : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.selectedValue}>
          {isMulti
            ? (
              Array.isArray(selectedLabels) && selectedLabels.length > 0
                ? (
                  selectedLabels.map((label, index) => (
                    <span key={index} className={styles.multiSelectItem}>
                      {label}
                      <X
                        size={12}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeValue((value as T[])[index]);
                        }}
                      />
                    </span>
                  ))
                )
                : <span className={styles.placeholder}>{placeholder}</span>
            )
            : (
              selectedLabels || (
                <span className={styles.placeholder}>{placeholder}</span>
              )
            )}
        </div>
        <ChevronDown size={16} className={styles.chevron} />
      </div>
      {isOpen && (
        <div className={styles.optionsList}>
          <input
            type="text"
            placeholder="Search..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <ul>
            {filteredOptions.map((option) => (
              <li
                key={option.value}
                className={`${styles.option} ${
                  isMulti
                    ? Array.isArray(value) && value.includes(option.value)
                      ? styles.selected
                      : ""
                    : value === option.value
                    ? styles.selected
                    : ""
                }`}
                onClick={() => handleSelect(option)}
              >
                {option.label}
                {isMulti &&
                  Array.isArray(value) &&
                  value.includes(option.value) && <Check size={16} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
