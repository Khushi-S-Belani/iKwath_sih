import React, { useState, useMemo } from 'react';
import { KwathaRecipe } from '../types';
import { RECIPE_CATEGORIES, RecipeCategory } from '../data/recipes';

interface Screen1CatalogProps {
  recipes: KwathaRecipe[];
  selectedRecipe: KwathaRecipe;
  onSelectRecipe: (recipe: KwathaRecipe) => void;
  onOpenRecipe: (recipe: KwathaRecipe) => void;
}

export const Screen1Catalog: React.FC<Screen1CatalogProps> = ({
  recipes,
  selectedRecipe,
  onSelectRecipe,
  onOpenRecipe,
}) => {
  const [activeCategory, setActiveCategory] = useState<RecipeCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Live filter as user types by recipe name or AFI code
  const filteredRecipes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchesCategory =
        activeCategory === 'All' || r.category.toLowerCase() === activeCategory.toLowerCase();
      const matchesSearch =
        !query ||
        r.name.toLowerCase().includes(query) ||
        r.afiCode.toLowerCase().includes(query) ||
        r.tag.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [recipes, activeCategory, searchQuery]);

  const handleCardClick = (recipe: KwathaRecipe) => {
    onSelectRecipe(recipe);
  };

  const handleCardDoubleClick = (recipe: KwathaRecipe) => {
    onSelectRecipe(recipe);
    onOpenRecipe(recipe);
  };

  return (
    <div
      className="screen show"
      id="screen-catalog"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      {/* PINNED TOP SECTION: Search Bar pinned at top */}
      <div style={{ flexShrink: 0, marginBottom: '16px' }}>
        {/* Search bar pinned at top of grid */}
        <div style={{ position: 'relative', width: '100%', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Search classical formulation by name or AFI code (e.g. 4:1, Guduchyadi, Asmarihara)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 18px 12px 42px',
              borderRadius: '12px',
              border: '1.5px solid var(--line-strong)',
              background: '#FFFFFF',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '14px',
              color: 'var(--cream)',
              outline: 'none',
              boxShadow: '0 2px 8px rgba(40, 44, 63, 0.04)',
              transition: 'border-color 0.15s ease',
            }}
          />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="2"
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              pointerEvents: 'none',
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 700,
                padding: '4px 8px',
              }}
              aria-label="Clear search query"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category filter chips stay BELOW the search bar */}
        <div
          className="chips"
          style={{
            margin: 0,
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '2px',
            scrollbarWidth: 'none',
          }}
        >
          {RECIPE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`chip ${activeCategory === cat ? 'sel' : ''}`}
              onClick={() => setActiveCategory(cat)}
              style={{
                whiteSpace: 'nowrap',
                padding: '8px 14px',
                fontSize: '12.5px',
                borderRadius: '999px',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of recipe cards below, each showing: formulation name, AFI class code, and one indication tag */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          paddingRight: '6px',
        }}
      >
        {filteredRecipes.length === 0 ? (
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '50px 20px',
              textAlign: 'center',
              color: 'var(--muted)',
            }}
          >
            <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '18px', fontWeight: 600 }}>
              No monographs found
            </div>
            <div style={{ fontSize: '13px', marginTop: '6px' }}>
              No formulation matches "{searchQuery}". Try searching by AFI code (e.g. 4:1) or herb name.
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: '16px', padding: '10px 18px', fontSize: '13px' }}
              onClick={() => {
                setActiveCategory('All');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '14px',
            }}
          >
            {filteredRecipes.map((recipe) => {
              const isSelected = selectedRecipe?.id === recipe.id;
              return (
                <div
                  key={recipe.id}
                  className="card"
                  onClick={() => handleCardClick(recipe)}
                  onDoubleClick={() => handleCardDoubleClick(recipe)}
                  style={{
                    cursor: 'pointer',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '110px',
                    borderRadius: '16px',
                    transition: 'all 0.15s ease',
                    border: isSelected
                      ? '2px solid var(--amber)'
                      : '1px solid var(--line)',
                    backgroundColor: isSelected ? '#FFFAF5' : 'var(--panel)',
                    boxShadow: isSelected
                      ? '0 6px 18px rgba(252, 128, 25, 0.16)'
                      : '0 2px 10px rgba(40, 44, 63, 0.04)',
                  }}
                >
                  {/* Top row: AFI Class Code & Single Indication Tag */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      gap: '8px',
                    }}
                  >
                    {/* AFI class code */}
                    <span
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isSelected ? 'var(--amber)' : 'var(--muted)',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {recipe.afiCode}
                    </span>

                    {/* One indication tag */}
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 600,
                        color: 'var(--amber)',
                        background: 'var(--amber-dim)',
                        padding: '3px 8px',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '170px',
                      }}
                      title={recipe.tag}
                    >
                      {recipe.tag}
                    </span>
                  </div>

                  {/* Formulation Name */}
                  <div
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: '15px',
                      fontWeight: 700,
                      lineHeight: 1.28,
                      color: 'var(--cream)',
                    }}
                  >
                    {recipe.name}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Screen 1 Footer: Exactly one primary button bottom-right */}
      <div className="setup-foot" style={{ marginTop: '16px', paddingTop: '16px' }}>
        <div className="ready-msg">
          <span className="dot-live"></span>
          <span style={{ fontSize: '13px' }}>
            {filteredRecipes.length} formulations available · Selected: <strong>{selectedRecipe.name}</strong> ({selectedRecipe.afiCode})
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onOpenRecipe(selectedRecipe)}
        >
          View Recipe Details →
        </button>
      </div>
    </div>
  );
};
