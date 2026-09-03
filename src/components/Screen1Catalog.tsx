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

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchesCategory =
        activeCategory === 'All' || r.category.toLowerCase() === activeCategory.toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        r.name.toLowerCase().includes(query) ||
        r.tag.toLowerCase().includes(query) ||
        r.afiCode.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [recipes, activeCategory, searchQuery]);

  const handleCardClick = (recipe: KwathaRecipe) => {
    onSelectRecipe(recipe);
    onOpenRecipe(recipe);
  };

  return (
    <div
      className="screen show"
      id="screen-catalog"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '16px',
          flexShrink: 0,
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', width: '310px', flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Search by name, tag, or AFI code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '11px 16px 11px 38px',
              borderRadius: '999px',
              border: '1.5px solid var(--line-strong)',
              background: '#FFFFFF',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: 'var(--cream)',
              outline: 'none',
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
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '15px',
              height: '15px',
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
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Category chips scrollable */}
        <div
          className="chips"
          style={{
            margin: 0,
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '2px',
            scrollbarWidth: 'none',
            flex: 1,
          }}
        >
          {RECIPE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`chip ${activeCategory === cat ? 'sel' : ''}`}
              onClick={() => setActiveCategory(cat)}
              style={{ whiteSpace: 'nowrap', padding: '8px 14px', fontSize: '12.5px' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe Grid - Scrollable (Only recipe name, short tag, AFI code) */}
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
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--muted)',
            }}
          >
            <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '18px', fontWeight: 600 }}>
              No formulations found
            </div>
            <div style={{ fontSize: '13px', marginTop: '6px' }}>
              Try searching with another keyword or select the "All" category.
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
              gap: '16px',
            }}
          >
            {filteredRecipes.map((recipe) => {
              const isSelected = selectedRecipe?.id === recipe.id;
              return (
                <div
                  key={recipe.id}
                  className="card"
                  onClick={() => handleCardClick(recipe)}
                  style={{
                    cursor: 'pointer',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '112px',
                    transition: 'all 0.15s ease',
                    border: isSelected
                      ? '1.5px solid var(--amber)'
                      : '1px solid var(--line)',
                    backgroundColor: isSelected ? '#FFFAF5' : 'var(--panel)',
                    boxShadow: isSelected
                      ? '0 6px 18px rgba(252, 128, 25, 0.16)'
                      : '0 2px 14px rgba(40, 44, 63, 0.04)',
                  }}
                >
                  {/* Top row: AFI Code & Tag */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--muted)',
                        letterSpacing: '0.4px',
                      }}
                    >
                      {recipe.afiCode}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--amber)',
                        background: 'var(--amber-dim)',
                        padding: '3px 9px',
                        borderRadius: '999px',
                      }}
                    >
                      {recipe.tag}
                    </span>
                  </div>

                  {/* Recipe Name */}
                  <div
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: '16.5px',
                      fontWeight: 700,
                      lineHeight: 1.25,
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

      {/* Screen 1 Footer: Exactly one primary orange button on the bottom-right */}
      <div className="setup-foot" style={{ marginTop: '16px', paddingTop: '16px' }}>
        <div className="ready-msg">
          <span className="dot-live"></span>
          <span>
            {filteredRecipes.length} formulations available · Tap card to select
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
