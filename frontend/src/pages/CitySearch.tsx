import { useParams, Navigate } from "react-router-dom";
import SEO from "@/components/SEO";
import SearchNannies from "./SearchNannies";

const SUPPORTED_CITIES: Record<string, { name: string; displayName: string }> = {
  lausanne: { name: "Lausanne", displayName: "Lausanne" },
  geneva: { name: "Geneva", displayName: "Geneva" },
  geneve: { name: "Geneva", displayName: "Genève" },
  zurich: { name: "Zurich", displayName: "Zürich" },
  bern: { name: "Bern", displayName: "Bern" },
  basel: { name: "Basel", displayName: "Basel" },
  lucerne: { name: "Lucerne", displayName: "Lucerne" },
};

const CitySearch = () => {
  const { city } = useParams<{ city: string }>();
  const cityKey = city?.toLowerCase() || "";
  const cityData = SUPPORTED_CITIES[cityKey];

  if (!cityData) {
    return <Navigate to="/search" replace />;
  }

  return (
    <>
      <SEO
        title={`Find a Nanny in ${cityData.displayName} | NannyElite`}
        description={`Discover verified nannies and babysitters in ${cityData.displayName}, Switzerland. Background-checked caregivers, real reviews, AI-powered matching.`}
        path={`/search/${cityKey}`}
      />
      <SearchNannies initialCityFilter={cityData.name} />
    </>
  );
};

export default CitySearch;
