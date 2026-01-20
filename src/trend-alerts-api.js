// Trend Alerts API - Detect and analyze complaint patterns
import { supabase } from './supabaseClient.js';

/**
 * Get trending complaint alerts for a specific admin role
 * @param {string} adminRole - The role of the admin
 * @param {number} days - Number of days to analyze (default: 7)
 * @param {number} threshold - Minimum complaints to trigger alert (default: 10)
 * @returns {Array} Array of alert objects with detailed information
 */
export async function getTrendingAlerts(adminRole, days = 7, threshold = 10) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString();

        let alerts = [];

        // Map admin roles to category names
        const roleCategoryMap = {
            'Facility Admin': 'Facility',
            'Academic Admin': 'Academic',
            'Technical Admin': 'Technical',
            'Student Disciplinary Admin': 'Student Disciplinary',
            'Administrative Admin': 'Administrative',
            'General Admin': 'Other'
        };

        // Master Admin sees all categories
        const categoriesToCheck = adminRole === 'Master Admin'
            ? Object.values(roleCategoryMap)
            : [roleCategoryMap[adminRole]];

        // Get category IDs
        const { data: categories, error: catError } = await supabase
            .from('category')
            .select('categoryid, categoryname')
            .in('categoryname', categoriesToCheck);

        if (catError) throw catError;

        for (const category of categories) {
            let categoryAlerts = [];

            switch (category.categoryname) {
                case 'Facility':
                    categoryAlerts = await getFacilityTrends(category.categoryid, startDateStr, threshold);
                    break;
                case 'Academic':
                    categoryAlerts = await getAcademicTrends(category.categoryid, startDateStr, threshold);
                    break;
                case 'Technical':
                    categoryAlerts = await getTechnicalTrends(category.categoryid, startDateStr, threshold);
                    break;
                case 'Student Disciplinary':
                    categoryAlerts = await getStudentBehaviorTrends(category.categoryid, startDateStr, threshold);
                    break;
                case 'Administrative':
                    categoryAlerts = await getAdministrativeTrends(category.categoryid, startDateStr, threshold);
                    break;
            }

            alerts = alerts.concat(categoryAlerts);
        }

        // Sort by complaint count (highest first)
        alerts.sort((a, b) => b.count - a.count);

        return alerts;

    } catch (error) {
        console.error('Error fetching trending alerts:', error);
        return [];
    }
}

/**
 * Get Facility complaint trends
 */
async function getFacilityTrends(categoryId, startDate, threshold) {
    console.log('🏢 Fetching facility trends...', { categoryId, startDate, threshold });

    const { data: complaints, error } = await supabase
        .from('complaint')
        .select(`
            complaintid,
            submitteddate,
            facilitycomplaint (
                typeoffacility,
                typeoffacilityissue,
                facilityfloor
            )
        `)
        .eq('categoryid', categoryId)
        .neq('complaintstatus', 'Deleted');
    // Removed date filter to get ALL complaints

    console.log('📊 Facility complaints fetched:', complaints?.length || 0, 'complaints');
    console.log('🔍 First complaint sample:', complaints?.[0]);

    if (error) {
        console.error('Error fetching facility trends:', error);
        return [];
    }

    // Group by issue type only (not location/floor)
    const trends = {};
    complaints.forEach((c, index) => {
        if (index < 3) console.log(`Processing complaint ${index}:`, c.facilitycomplaint);

        // facilitycomplaint is an object, not an array!
        if (c.facilitycomplaint && typeof c.facilitycomplaint === 'object') {
            const fc = c.facilitycomplaint; // Direct access, not [0]
            console.log('Facility complaint data:', fc); // Log the actual data

            // Use the exact field names from the database
            const issueType = fc.typeoffacilityissue || fc.typeOfFacilityIssue;
            const facilityType = fc.typeoffacility || fc.typeOfFacility;
            const floor = fc.facilityfloor || fc.facilityFloor;

            if (!facilityType) {
                console.warn('⚠️ No facility type found in:', fc);
                return;
            }

            const key = facilityType; // Group by facility location (e.g., Library, Washroom)

            if (!trends[key]) {
                trends[key] = {
                    category: 'Facility',
                    subcategory: facilityType, // The location name (Library, Washroom, etc.)
                    count: 0,
                    complaintIds: [],
                    issues: new Set(), // Track different types of issues in this location
                    floors: new Set() // Track unique floors
                };
            }
            trends[key].count++;
            trends[key].complaintIds.push(c.complaintid);
            if (issueType) trends[key].issues.add(issueType); // Track issue types
            if (floor) trends[key].floors.add(floor);
        } else {
            if (index < 3) console.warn(`⚠️ Complaint ${c.complaintid} has no facilitycomplaint data`);
        }
    });

    console.log('📈 Grouped facility trends:', Object.values(trends).map(t => ({ subcategory: t.subcategory, count: t.count })));
    console.log('🎯 Filtering with threshold:', threshold);

    // Filter by threshold and add detailed messages
    return Object.values(trends)
        .filter(t => t.count >= threshold)
        .map(t => {
            // Convert Sets to comma-separated strings for display
            const issuesStr = t.issues.size > 0 ? Array.from(t.issues).slice(0, 3).join(', ') : 'Various issues';
            const floorStr = t.floors.size > 0 ? Array.from(t.floors).slice(0, 3).join(', ') : '';

            return enrichAlertWithDetails({
                ...t,
                location: t.subcategory, // The facility name (Library, Washroom, etc.)
                issueTypes: issuesStr, // Types of issues in this location
                floor: floorStr,
                issues: undefined, // Remove Set objects
                floors: undefined
            });
        });
}

/**
 * Get Academic complaint trends
 */
async function getAcademicTrends(categoryId, startDate, threshold) {
    const { data: complaints, error } = await supabase
        .from('complaint')
        .select(`
            complaintid,
            submitteddate,
            academiccomplaint (
                specificationofissue,
                modulename,
                currentlevel,
                semester
            )
        `)
        .eq('categoryid', categoryId)
        .neq('complaintstatus', 'Deleted')
        .gte('submitteddate', startDate);

    if (error) {
        console.error('Error fetching academic trends:', error);
        return [];
    }

    const trends = {};
    complaints.forEach(c => {
        // academiccomplaint is an object, not an array!
        if (c.academiccomplaint && typeof c.academiccomplaint === 'object') {
            const ac = c.academiccomplaint; // Direct access, not [0]

            const issueType = ac.specificationofissue;
            const level = ac.currentlevel;

            if (!issueType) {
                console.warn('⚠️ No issue type found in academic complaint:', ac);
                return;
            }

            const key = issueType; // Group by issue type (grading, scheduling, etc.)

            if (!trends[key]) {
                trends[key] = {
                    category: 'Academic',
                    subcategory: issueType,
                    count: 0,
                    complaintIds: [],
                    levels: new Set() // Track unique levels
                };
            }
            trends[key].count++;
            trends[key].complaintIds.push(c.complaintid);
            if (level) trends[key].levels.add(level);
        }
    });

    return Object.values(trends)
        .filter(t => t.count >= threshold)
        .map(t => {
            const levelStr = t.levels.size > 0 ? Array.from(t.levels).slice(0, 3).join(', ') : '';

            return enrichAlertWithDetails({
                ...t,
                level: levelStr,
                levels: undefined
            });
        });
}

/**
 * Get Technical complaint trends
 */
async function getTechnicalTrends(categoryId, startDate, threshold) {
    const { data: complaints, error } = await supabase
        .from('complaint')
        .select(`
            complaintid,
            submitteddate,
            technicalcomplaint (
                typeofissue,
                deviceaffected
            )
        `)
        .eq('categoryid', categoryId)
        .neq('complaintstatus', 'Deleted')
        .gte('submitteddate', startDate);

    if (error) {
        console.error('Error fetching technical trends:', error);
        return [];
    }

    const trends = {};
    complaints.forEach(c => {
        // technicalcomplaint is an object, not an array!
        if (c.technicalcomplaint && typeof c.technicalcomplaint === 'object') {
            const tc = c.technicalcomplaint; // Direct access, not [0]
            const key = tc.typeofissue;

            if (!trends[key]) {
                trends[key] = {
                    category: 'Technical',
                    subcategory: tc.typeofissue,
                    count: 0,
                    complaintIds: []
                };
            }
            trends[key].count++;
            trends[key].complaintIds.push(c.complaintid);
        }
    });

    return Object.values(trends)
        .filter(t => t.count >= threshold)
        .map(t => enrichAlertWithDetails(t));
}

/**
 * Get Student Behavior complaint trends
 */
async function getStudentBehaviorTrends(categoryId, startDate, threshold) {
    const { data: complaints, error } = await supabase
        .from('complaint')
        .select(`
            complaintid,
            submitteddate,
            studentbehaviorcomplaint (
                typeofbehavior,
                locationofincident
            )
        `)
        .eq('categoryid', categoryId)
        .neq('complaintstatus', 'Deleted')
        .gte('submitteddate', startDate);

    if (error) {
        console.error('Error fetching behavior trends:', error);
        return [];
    }

    const trends = {};
    complaints.forEach(c => {
        // studentbehaviorcomplaint is an object, not an array!
        if (c.studentbehaviorcomplaint && typeof c.studentbehaviorcomplaint === 'object') {
            const sbc = c.studentbehaviorcomplaint; // Direct access, not [0]
            const key = sbc.typeofbehavior;

            if (!trends[key]) {
                trends[key] = {
                    category: 'Student Disciplinary',
                    subcategory: sbc.typeofbehavior,
                    count: 0,
                    complaintIds: []
                };
            }
            trends[key].count++;
            trends[key].complaintIds.push(c.complaintid);
        }
    });

    return Object.values(trends)
        .filter(t => t.count >= threshold)
        .map(t => enrichAlertWithDetails(t));
}

/**
 * Get Administrative complaint trends
 */
async function getAdministrativeTrends(categoryId, startDate, threshold) {
    const { data: complaints, error } = await supabase
        .from('complaint')
        .select(`
            complaintid,
            submitteddate,
            administrativecomplaint (
                complaintdepartment
            )
        `)
        .eq('categoryid', categoryId)
        .neq('complaintstatus', 'Deleted')
        .gte('submitteddate', startDate);

    if (error) {
        console.error('Error fetching administrative trends:', error);
        return [];
    }

    const trends = {};
    complaints.forEach(c => {
        // administrativecomplaint is an object, not an array!
        if (c.administrativecomplaint && typeof c.administrativecomplaint === 'object') {
            const ac = c.administrativecomplaint; // Direct access, not [0]
            const key = ac.complaintdepartment;

            if (!trends[key]) {
                trends[key] = {
                    category: 'Administrative',
                    subcategory: ac.complaintdepartment,
                    count: 0,
                    complaintIds: []
                };
            }
            trends[key].count++;
            trends[key].complaintIds.push(c.complaintid);
        }
    });

    return Object.values(trends)
        .filter(t => t.count >= threshold)
        .map(t => enrichAlertWithDetails(t));
}

/**
 * Enrich alert with detailed messages and action items
 */
function enrichAlertWithDetails(trend) {
    const severity = getSeverityLevel(trend.count);
    const actionItems = getActionItems(trend);
    const urgencyMessage = getUrgencyMessage(trend, severity);

    return {
        ...trend,
        severity: severity.level,
        severityColor: severity.color,
        severityIcon: severity.icon,
        urgencyMessage,
        actionItems,
        detailedMessage: generateDetailedMessage(trend, severity)
    };
}

/**
 * Determine severity level based on complaint count
 * Simplified to always return "ATTENTION NEEDED"
 */
function getSeverityLevel(count) {
    return {
        level: 'warning',
        color: 'yellow',
        icon: '⚠️',
        label: 'ATTENTION NEEDED'
    };
}

/**
 * Get simple informational message based on complaint type
 */
function getActionItems(trend) {
    const actions = [];

    // Single informational action for all trends
    let message = '';

    switch (trend.category) {
        case 'Facility':
            const location = trend.location ? ` in the ${trend.location}` : '';
            const floor = trend.floor ? ` on ${trend.floor}` : '';
            message = `Please review and address the recurring ${trend.subcategory.toLowerCase()} issues${location}${floor}. Consider inspecting the area and implementing necessary improvements to prevent future complaints.`;
            break;

        case 'Technical':
            message = `Please investigate and resolve the ${trend.subcategory.toLowerCase()} affecting users. Consider coordinating with the technical team to implement a permanent solution.`;
            break;

        case 'Academic':
            const level = trend.level ? ` for ${trend.level} students` : '';
            message = `Please review the ${trend.subcategory.toLowerCase()} concerns${level}. Consider meeting with relevant faculty or staff to address these issues.`;
            break;

        case 'Student Disciplinary':
            message = `Please review the reported ${trend.subcategory.toLowerCase()} incidents. Consider implementing preventive measures and awareness programs.`;
            break;

        case 'Administrative':
            message = `Please review the ${trend.subcategory} department concerns. Consider improving service delivery and communication with students.`;
            break;

        default:
            message = `Please review and address these recurring complaints to improve the situation.`;
    }

    actions.push({
        message: message
    });

    return actions;
}

/**
 * Generate urgency message
 * Simplified to show uniform message
 */
function getUrgencyMessage(trend, severity) {
    const location = trend.location ? ` in ${trend.location}` : '';
    const floor = trend.floor ? ` (${trend.floor})` : '';
    const level = trend.level ? ` for ${trend.level} students` : '';

    // For Facility alerts, show what types of issues are occurring
    const issueTypes = trend.issueTypes ? ` - Issues include: ${trend.issueTypes}` : '';

    return `⚠️ ATTENTION: ${trend.count} complaints about "${trend.subcategory}"${location}${floor}${level}${issueTypes}. Please review and take appropriate action.`;
}

/**
 * Generate detailed message for alert card
 */
function generateDetailedMessage(trend, severity) {
    const location = trend.location ? ` in the ${trend.location}` : '';
    const floor = trend.floor ? ` on ${trend.floor}` : '';
    const level = trend.level ? ` (${trend.level} students)` : '';

    return `The system has detected a significant pattern: <strong>${trend.count} complaints</strong> regarding <strong>"${trend.subcategory}"</strong>${location}${floor}${level} have been submitted recently. This trend indicates a persistent issue that requires your immediate attention and corrective action to improve the situation and prevent future complaints.`;
}
