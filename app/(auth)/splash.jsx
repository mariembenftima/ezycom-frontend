
import { useEffect } from 'react'

import {
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native'

import { useRouter } from 'expo-router'

import { LinearGradient } from 'expo-linear-gradient'

const { width, height } = Dimensions.get('window')

export default function SplashScreen() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/login')
    }, 2500)

    return () => clearTimeout(timer)

  }, [])

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0A1525', '#0D2A40', '#0A1E35']}
        start={{ x: 0, y: 0 }}    
        end={{ x: 1, y: 1 }}      
        style={styles.container}
      >

        <View style={styles.gridOverlay} pointerEvents="none">
          {[...Array(5)].map((_, i) => (
            <View
              key={i}
              style={[styles.gridLine, { top: (height / 6) * (i + 1) }]}
            />
          ))}
        </View>

        <View style={styles.glowCircle} />

        <View style={styles.centerContent}>

          <View style={styles.logoCircle}>

            <View style={styles.barChart}>
              <View style={styles.barWrapper}>
                <View style={[styles.bar, styles.barTall]} />
                <View style={[styles.barCap, styles.barCapTop]} />
              </View>

              <View style={styles.barWrapper}>
                <View style={[styles.bar, styles.barMedium]} />
                <View style={styles.barCap} />
              </View>

              <View style={styles.barWrapper}>
                <View style={[styles.bar, styles.barTall]} />
                <View style={[styles.barCap, styles.barCapGlow]} />
              </View>
            </View>
          </View>

          <View style={styles.brandRow}>
            <Text style={styles.brandEzy}>Ezy</Text>
            <Text style={styles.brandCom}>Com</Text>
          </View>

          <Text style={styles.tagline}>EZYCOM</Text>

          <Text style={styles.subtitle}>E-Commerce Manager</Text>

          <View style={styles.dividerLine} />

        </View>

        <View style={styles.bottomSection}>

          <View style={styles.pill}>
            <View style={styles.pillIcon}>
              <View style={styles.pillIconDot} />
            </View>
            <Text style={styles.pillText}>E-Commerce</Text>
          </View>

          <View style={styles.pill}>
            <View style={styles.pillIcon}>
              <View style={styles.pillIconDot} />
            </View>
            <Text style={styles.pillText}>Facturation</Text>
          </View>

          <View style={styles.pill}>
            <View style={styles.pillIcon}>
              <View style={styles.pillIconDot} />
            </View>
            <Text style={styles.pillText}>Pro Manager</Text>
          </View>

        </View>

        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <Text style={styles.versionText}>v2.0</Text>

      </LinearGradient>
    </>
  )
}

const styles = StyleSheet.create({

  container: {
    flex: 1,               
    alignItems: 'center',   
  },

  gridOverlay: {
    position: 'absolute',  
    width: '100%',
    height: '100%',
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)', 
  },

  glowCircle: {
    position: 'absolute',
    top: height * 0.2,         
    width: width * 1.1,       
    height: height * 0.45,
    borderRadius: width,        
    backgroundColor: 'rgba(41,182,216,0.07)', 
  },

  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },

  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,            
    backgroundColor: '#112240',
    borderWidth: 2,
    borderColor: 'rgba(41,182,216,0.6)', 
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#29B6D8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,               
  },

  barChart: {
    flexDirection: 'row',        
    alignItems: 'flex-end',      
    gap: 6,                     
    height: 55,
  },

  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  bar: {
    width: 10,
    borderRadius: 5,             
    backgroundColor: '#29B6D8',
  },

  barTall:   { height: 40 },
  barMedium: { height: 25 },

  barCap: {
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(41,182,216,0.5)',
    marginBottom: 2,
  },
  barCapTop: {
    backgroundColor: '#00D4F5',
  },
  barCapGlow: {
    backgroundColor: '#00D4F5',
    shadowColor: '#00D4F5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  brandRow: {
    flexDirection: 'row',
    marginTop: 24,
  },
  brandEzy: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  brandCom: {
    fontSize: 42,
    fontWeight: '700',
    color: '#29B6D8',
    letterSpacing: -1,
  },

  tagline: {
    fontSize: 13,
    color: '#29B6D8',
    letterSpacing: 4,           
    marginTop: 4,
    opacity: 0.9,
  },

  subtitle: {
    fontSize: 12,
    color: '#7A9ABA',          
    letterSpacing: 1,
    marginTop: 8,
  },

  dividerLine: {
    width: 150,
    height: 1,
    backgroundColor: 'rgba(41,182,216,0.3)',
    marginTop: 30,
  },

  bottomSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 20,
  },

  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#112240',   
    borderWidth: 1,
    borderColor: 'rgba(41,182,216,0.4)',
    borderRadius: 30,             
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },

  pillIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(41,182,216,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#29B6D8',
  },
  pillText: {
    color: '#29B6D8',
    fontSize: 11,
    fontWeight: '600',
  },

  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotActive: {
    backgroundColor: '#29B6D8',  
    width: 20,                   
  },

  versionText: {
    color: '#2A4A6A',
    fontSize: 11,
    marginBottom: 30,
  },
})