import sys

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the start and end of AI Lab
ai_lab_start = -1
ai_lab_end = -1
for i, line in enumerate(lines):
    if '<!-- ════════════════ 05 · AI LAB ════════════════ -->' in line:
        ai_lab_start = i
    elif ai_lab_start != -1 and '<!-- ════════════════ 06 · ROADMAP ════════════════ -->' in line:
        ai_lab_end = i
        break

if ai_lab_start != -1 and ai_lab_end != -1:
    ai_lab_lines = lines[ai_lab_start:ai_lab_end]
    
    # Remove AI Lab from its original location
    del lines[ai_lab_start:ai_lab_end]

    # Find where to insert it (before EXPLORE)
    explore_start = -1
    for i, line in enumerate(lines):
        if '<!-- ════════════════ 03 · EXPLORE ════════════════ -->' in line:
            explore_start = i
            break
            
    if explore_start != -1:
        # Update AI Lab numbers
        for i in range(len(ai_lab_lines)):
            if '05 · AI LAB' in ai_lab_lines[i]:
                ai_lab_lines[i] = ai_lab_lines[i].replace('05 · AI LAB', '03 · AI LAB')
            if '05 · AI Lab' in ai_lab_lines[i]:
                ai_lab_lines[i] = ai_lab_lines[i].replace('05 · AI Lab', '03 · AI Lab')

        lines = lines[:explore_start] + ai_lab_lines + lines[explore_start:]

        # Now update numbers for EXPLORE and BUILD
        for i in range(len(lines)):
            if '<!-- ════════════════ 03 · EXPLORE ════════════════ -->' in lines[i]:
                lines[i] = lines[i].replace('03 · EXPLORE', '04 · EXPLORE')
            if '<span class="chapter-tag reveal">03 · Campaigns</span>' in lines[i]:
                lines[i] = lines[i].replace('03 · Campaigns', '04 · Campaigns')
            if '<!-- ════════════════ 04 · BUILD ════════════════ -->' in lines[i]:
                lines[i] = lines[i].replace('04 · BUILD', '05 · BUILD')
            if '<span class="chapter-tag reveal">04 · Toolkit</span>' in lines[i]:
                lines[i] = lines[i].replace('04 · Toolkit', '05 · Toolkit')

        with open('index.html', 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print('Successfully moved AI Lab and updated numbers.')
    else:
        print('Could not find EXPLORE section.')
else:
    print('Could not find AI Lab section.')
