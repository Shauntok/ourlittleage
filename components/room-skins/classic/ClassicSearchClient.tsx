"use client";

import SearchView from "@/components/search/SearchView";
import styles from "./search.module.css";

export default function ClassicSearchClient() {
  return <SearchView styles={styles} variant="classic" />;
}
