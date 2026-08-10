const PROHIBITED_CATEGORIES = [
  'Weapons',
  'Controlled Drugs',
  'Tobacco & Nicotine Products',
  'Alcohol',
  'Prescription Medication',
  'Adult / Explicit Content',
  'Counterfeit Goods',
  'Financial Fraud',
  'Explosives & Hazardous Materials',
  'Account Credentials',
]

const PICKUP_LOCATIONS = [
  'New Cavendish Street',
  'Regent Street',
  'Marylebone (Westminster Business School)',
  'Harrow Campus',
]

export default function Guidelines({ onClose }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Community Guidelines</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          <p style={styles.intro}>
            Westminster Marketplace exists so students and staff can buy, sell and give away
            items within a trusted community. These guidelines explain what's expected of
            everyone who uses it.
          </p>

          <Section title="Who can use this marketplace">
            <p style={styles.text}>
              Access is limited to people with a verified <strong>@westminster.ac.uk</strong> email
              address. Accounts are for personal use by the student or staff member who registered
              them — don't create or use an account on someone else's behalf.
            </p>
          </Section>

          <Section title="What you can't list">
            <p style={styles.text}>
              Listings are automatically checked and blocked if they reference any of the
              following. Trying to work around the filter (misspellings, spacing tricks, etc.)
              is still a violation and may be reported for manual review.
            </p>
            <div style={styles.chipGrid}>
              {PROHIBITED_CATEGORIES.map(c => (
                <span key={c} style={styles.chip}>⛔ {c}</span>
              ))}
            </div>
          </Section>

          <Section title="Posting a listing">
            <ul style={styles.list}>
              <li>Only list items you personally own and are entitled to sell or give away.</li>
              <li>Use accurate titles, descriptions and condition ratings — don't misrepresent an item to get a sale.</li>
              <li>Use real photos of the actual item wherever possible.</li>
              <li>Price fairly. "Wanted" ads should reflect a genuine, realistic budget.</li>
              <li>Mark a listing as sold once it's gone — don't leave stale listings live to farm views.</li>
            </ul>
          </Section>

          <Section title="Messaging, offers & deals">
            <ul style={styles.list}>
              <li>Keep communication respectful. Harassment, threats or discriminatory language toward another user will get a listing or account reported and reviewed.</li>
              <li>Only accept an offer if you intend to honor it — accepting locks the listing to that buyer.</li>
              <li>Leave honest ratings after a deal completes. Ratings help the whole community trust each other.</li>
            </ul>
          </Section>

          <Section title="Meeting up safely">
            <ul style={styles.list}>
              <li>Prefer meeting on campus in a public, populated space during daytime hours.</li>
              <li>Common pickup points other students use: {PICKUP_LOCATIONS.join(', ')}, or another public campus location you both agree on.</li>
              <li>Never send payment or deposits before seeing the item in person, and be wary of anyone asking to move the conversation off-platform before a deal is agreed.</li>
              <li>Don't share your card details, bank login, or full home address through Messages.</li>
            </ul>
          </Section>

          <Section title="Reporting a problem">
            <p style={styles.text}>
              Use the <strong>🚩 Report</strong> button on a listing if it breaks these guidelines,
              looks like a scam, or makes you uncomfortable. Reports go to the marketplace admin
              team for review, and listings can be removed if they're found to violate policy.
              Submitting a report you know to be false may result in action against your account.
            </p>
            <p style={styles.text}>
              For anything else — account issues, a dispute with another user, or a question about
              these guidelines — use <strong>Contact Admin</strong> from the footer.
            </p>
          </Section>

          <button style={styles.doneBtn} onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,6,38,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '1rem',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '6px',
    width: '100%',
    maxWidth: '620px',
    maxHeight: '88vh',
    overflowY: 'auto',
    boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #f0ebf8',
    position: 'sticky',
    top: 0,
    backgroundColor: '#1a0844',
    zIndex: 1,
  },
  title: {
    margin: 0,
    fontSize: '1.3rem',
    color: '#c9a84c',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontWeight: 600,
    letterSpacing: '0.03em',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.6)',
    padding: '0.25rem',
    lineHeight: 1,
  },
  body: {
    padding: '1.5rem',
  },
  intro: {
    color: '#4a3f5c',
    fontSize: '0.92rem',
    lineHeight: 1.65,
    margin: '0 0 1.5rem',
  },
  section: {
    marginBottom: '1.5rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #f3f0f8',
  },
  sectionTitle: {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#1a0844',
    margin: '0 0 0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
  },
  text: {
    color: '#4a3f5c',
    fontSize: '0.88rem',
    lineHeight: 1.65,
    margin: '0 0 0.6rem',
  },
  list: {
    margin: 0,
    paddingLeft: '1.2rem',
    color: '#4a3f5c',
    fontSize: '0.88rem',
    lineHeight: 1.75,
  },
  chipGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    marginTop: '0.75rem',
  },
  chip: {
    fontSize: '0.75rem',
    padding: '0.3rem 0.75rem',
    borderRadius: '20px',
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    color: '#9a3412',
    fontWeight: 500,
  },
  doneBtn: {
    width: '100%',
    padding: '0.85rem',
    backgroundColor: '#1a0844',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    fontFamily: "'Inter', system-ui, sans-serif",
    marginTop: '0.5rem',
  },
}
